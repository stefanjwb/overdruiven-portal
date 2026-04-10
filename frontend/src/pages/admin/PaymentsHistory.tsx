import { useEffect, useState } from 'react';
import {
  Title, Text, Badge, Button, Stack, Table, Loader, Center, Accordion, Group,
  Popover, Divider, ActionIcon,
} from '@mantine/core';
import { IconX, IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getAdminPayments, rejectPayment } from '../../api/admin';
import dayjs from 'dayjs';
import 'dayjs/locale/nl';

dayjs.locale('nl');

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_verification: { label: 'In behandeling', color: 'orange' },
  paid:                 { label: 'Betaald',         color: 'green'  },
  unpaid:               { label: 'Niet betaald',    color: 'red'    },
};

function PaymentInfo({ p }: { p: any }) {
  const persons = 1 + (p.guests ?? 0);
  const hasGuests = p.guests > 0;
  const hasPartialApproval = p.approved_amount > 0 && p.status !== 'paid';

  return (
    <Popover width={240} withArrow shadow="md" position="left">
      <Popover.Target>
        <ActionIcon variant="subtle" color="gray" size="sm">
          <IconInfoCircle size={16} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Text size="xs" fw={600}>Betalingsdetails</Text>
          <Divider />

          <Group justify="space-between">
            <Text size="xs" c="dimmed">Kosten per persoon</Text>
            <Text size="xs">€ {Number(p.cost ?? 0).toFixed(2)}</Text>
          </Group>

          <Group justify="space-between">
            <Text size="xs" c="dimmed">Aantal personen</Text>
            <Text size="xs">{persons}</Text>
          </Group>

          {hasGuests && p.guest_names?.length > 0 && (
            <div>
              <Text size="xs" c="dimmed" mb={2}>Gasten</Text>
              {p.guest_names.map((name: string, i: number) => (
                <Text key={i} size="xs">· {name}</Text>
              ))}
            </div>
          )}

          {hasGuests && (!p.guest_names || p.guest_names.length === 0) && (
            <Group justify="space-between">
              <Text size="xs" c="dimmed">Gasten</Text>
              <Text size="xs">{p.guests}</Text>
            </Group>
          )}

          <Divider />

          <Group justify="space-between">
            <Text size="xs" c="dimmed">Totaal</Text>
            <Text size="xs" fw={600}>€ {Number(p.total_amount ?? 0).toFixed(2)}</Text>
          </Group>

          {hasPartialApproval && (
            <>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Eerder goedgekeurd</Text>
                <Text size="xs" c="green">€ {Number(p.approved_amount).toFixed(2)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Nog openstaand</Text>
                <Text size="xs" c="orange" fw={600}>€ {Number(p.pending_amount).toFixed(2)}</Text>
              </Group>
            </>
          )}

          <Divider />
          <Text size="xs" ff="monospace" c="dimmed">{p.reference}</Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

export default function PaymentsHistory() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  const load = () => {
    getAdminPayments()
      .then(setPayments)
      .catch(() => notifications.show({ message: 'Laden mislukt.', color: 'red' }))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRevert = async (id: number) => {
    setActionId(id);
    try {
      await rejectPayment(id);
      notifications.show({ message: 'Betaling teruggedraaid.', color: 'orange' });
      load();
    } catch {
      notifications.show({ message: 'Terugdraaien mislukt.', color: 'red' });
    } finally {
      setActionId(null);
    }
  };

  if (loading) return <Center h="40vh"><Loader color="brand" type="dots" size="lg" /></Center>;

  const byActivity = payments.reduce<Record<number, { name: string; date: string; items: any[] }>>((acc, p) => {
    if (!acc[p.activity_id]) acc[p.activity_id] = { name: p.activity_name, date: p.activity_date, items: [] };
    acc[p.activity_id].items.push(p);
    return acc;
  }, {});

  const activities = Object.entries(byActivity).sort(([, a], [, b]) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (activities.length === 0) {
    return (
      <Stack gap="xl">
        <Title order={2}>Betalingen Historie</Title>
        <Text c="dimmed">Nog geen betalingen.</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="xl">
      <Title order={2}>Betalingen Historie</Title>

      <Accordion variant="separated" chevronPosition="right">
        {activities.map(([actId, act]) => {
          const paidCount = act.items.filter((p: any) => p.status === 'paid').length;

          return (
            <Accordion.Item key={actId} value={String(actId)}>
              <Accordion.Control>
                <Group justify="space-between" pr="md">
                  <div>
                    <Text fw={600}>{act.name}</Text>
                    <Text size="xs" c="dimmed">{dayjs(act.date).format('dddd D MMMM YYYY')}</Text>
                  </div>
                  <Group gap="xs">
                    <Badge color="green" variant="light">{paidCount} betaald</Badge>
                    <Badge color="gray" variant="light">{act.items.length} totaal</Badge>
                  </Group>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                {/* Desktop tabel */}
                <Table.ScrollContainer minWidth={500} visibleFrom="sm">
                  <Table striped withTableBorder withColumnBorders>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Gebruiker</Table.Th>
                        <Table.Th>Personen</Table.Th>
                        <Table.Th>Bedrag</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th></Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {act.items.map((p: any) => {
                        const s = STATUS_LABELS[p.status] ?? { label: p.status, color: 'gray' };
                        return (
                          <Table.Tr key={p.id}>
                            <Table.Td>
                              <Text size="sm" fw={500}>{p.username}</Text>
                              <Text size="xs" c="dimmed">{p.email}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Group gap={4}>
                                <Text size="sm">{1 + (p.guests ?? 0)}</Text>
                                {p.guests > 0 && p.guest_names?.length > 0 && (
                                  <Text size="xs" c="dimmed">({p.guest_names.join(', ')})</Text>
                                )}
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              <Group gap={4}>
                                <Text size="sm" fw={600}>€ {Number(p.total_amount ?? p.cost).toFixed(2)}</Text>
                                {p.approved_amount > 0 && p.status !== 'paid' && (
                                  <Text size="xs" c="orange">+€ {Number(p.pending_amount).toFixed(2)} nieuw</Text>
                                )}
                              </Group>
                            </Table.Td>
                            <Table.Td><Badge color={s.color} variant="light">{s.label}</Badge></Table.Td>
                            <Table.Td>
                              <Group gap="xs" justify="flex-end">
                                <PaymentInfo p={p} />
                                {p.status === 'paid' && (
                                  <Button size="xs" color="red" variant="subtle" leftSection={<IconX size={14} />}
                                    loading={actionId === p.id} onClick={() => handleRevert(p.id)}>
                                    Terugdraaien
                                  </Button>
                                )}
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>

                {/* Mobiele kaartweergave */}
                <Stack gap="xs" hiddenFrom="sm">
                  {act.items.map((p: any) => {
                    const s = STATUS_LABELS[p.status] ?? { label: p.status, color: 'gray' };
                    return (
                      <div key={p.id} style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8, padding: '10px 12px' }}>
                        <Group justify="space-between" wrap="nowrap" align="flex-start">
                          <div style={{ minWidth: 0 }}>
                            <Group gap="xs" wrap="wrap" mb={2}>
                              <Text size="sm" fw={600}>{p.username}</Text>
                              <Badge color={s.color} variant="light" size="xs">{s.label}</Badge>
                            </Group>
                            <Text size="sm" fw={700}>€ {Number(p.total_amount ?? p.cost).toFixed(2)}</Text>
                            <Text size="xs" c="dimmed">
                              {1 + (p.guests ?? 0)} {(1 + (p.guests ?? 0)) === 1 ? 'persoon' : 'personen'}
                              {p.guest_names?.length > 0 && ` · ${p.guest_names.join(', ')}`}
                            </Text>
                            {p.approved_amount > 0 && p.status !== 'paid' && (
                              <Text size="xs" c="orange">Eerder goedgekeurd: € {Number(p.approved_amount).toFixed(2)} · Nieuw: € {Number(p.pending_amount).toFixed(2)}</Text>
                            )}
                          </div>
                          <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                            <PaymentInfo p={p} />
                            {p.status === 'paid' && (
                              <Button size="xs" color="red" variant="subtle" leftSection={<IconX size={14} />}
                                loading={actionId === p.id} onClick={() => handleRevert(p.id)}>
                                Terugdraaien
                              </Button>
                            )}
                          </Group>
                        </Group>
                      </div>
                    );
                  })}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </Stack>
  );
}
