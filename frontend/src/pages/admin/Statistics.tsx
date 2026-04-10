import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Title, Text, Stack, Loader, Center, Group, Badge,
  NumberFormatter, Accordion, Divider, Button,
} from '@mantine/core';
import {
  IconCalendarEvent, IconUsers, IconCoin, IconReceipt,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getStatistics } from '../../api/admin';
import dayjs from 'dayjs';
import 'dayjs/locale/nl';

dayjs.locale('nl');

function euro(value: number) {
  return (
    <NumberFormatter
      prefix="€ "
      value={value}
      decimalScale={2}
      fixedDecimalScale
      thousandSeparator="."
      decimalSeparator=","
    />
  );
}


function DetailRow({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <Group justify="space-between" py={10} style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
      <Text size="sm" c="dimmed">{label}</Text>
      <Text size="sm" fw={500} c={color}>{value}</Text>
    </Group>
  );
}

export default function Statistics() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getStatistics()
      .then(setRows)
      .catch(() => notifications.show({ message: 'Laden mislukt.', color: 'red' }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Center h="40vh"><Loader color="brand" type="dots" size="lg" /></Center>;

  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Statistieken per les</Title>
        <Text c="dimmed" size="sm">Inkomsten en uitgaven overzicht</Text>
      </div>

      <Divider />

      {rows.length === 0 ? (
        <Text c="dimmed" ta="center" py={40}>Nog geen activiteiten met financiële data.</Text>
      ) : (
        <Accordion variant="separated" chevronPosition="right">
          {rows.map(r => (
            <Accordion.Item key={r.activity_id} value={String(r.activity_id)}>
              <Accordion.Control>
                <Group justify="space-between" pr="md" wrap="nowrap">
                  <div style={{ minWidth: 0 }}>
                    <Text fw={600} truncate>{r.activity_name}</Text>
                    <Text size="xs" c="dimmed">{dayjs(r.activity_date).format('dddd D MMMM YYYY')}</Text>
                  </div>
                  <Badge
                    color={r.net > 0 ? 'teal' : r.net < 0 ? 'red' : 'gray'}
                    variant="light"
                    size="md"
                    style={{ flexShrink: 0 }}
                  >
                    {euro(r.net)}
                  </Badge>
                </Group>
              </Accordion.Control>

              <Accordion.Panel>
                <Stack gap={0}>
                  <DetailRow
                    label="Deelnemers"
                    value={
                      <Group gap={6}>
                        <IconUsers size={14} />
                        <span>{r.participants}</span>
                      </Group>
                    }
                  />
                  <DetailRow
                    label="Prijs per persoon"
                    value={r.cost_per_person != null ? euro(r.cost_per_person) : '—'}
                  />

                  <Divider my="md" label="Inkomsten" labelPosition="left" />

                  <DetailRow
                    label="Ontvangen"
                    value={
                      <Group gap={6}>
                        <IconCoin size={14} color="var(--mantine-color-green-6)" />
                        <Text span c="green" fw={600}>{euro(r.income_paid)}</Text>
                      </Group>
                    }
                  />
                  <DetailRow
                    label="Openstaand"
                    value={
                      <Text span c={r.income_pending > 0 ? 'yellow.7' : 'dimmed'}>
                        {euro(r.income_pending)}
                      </Text>
                    }
                  />

                  <Divider my="md" label="Uitgaven" labelPosition="left" />

                  <DetailRow
                    label="Declaraties (goedgekeurd)"
                    value={
                      <Group gap={6}>
                        <IconReceipt size={14} color={r.expenses > 0 ? 'var(--mantine-color-red-6)' : undefined} />
                        <Text span c={r.expenses > 0 ? 'red' : 'dimmed'}>{euro(r.expenses)}</Text>
                      </Group>
                    }
                  />

                  <Divider my="md" />

                  <Group justify="space-between" pt={4} pb={4}>
                    <Text fw={700}>Netto resultaat</Text>
                    <Badge
                      color={r.net > 0 ? 'teal' : r.net < 0 ? 'red' : 'gray'}
                      variant="filled"
                      size="lg"
                    >
                      {euro(r.net)}
                    </Badge>
                  </Group>

                  <Button
                    variant="light"
                    color="brand"
                    size="xs"
                    leftSection={<IconReceipt size={14} />}
                    mt="sm"
                    onClick={() => navigate(`/admin/declaraties?q=${encodeURIComponent(r.activity_name)}`)}
                  >
                    Bekijk declaraties
                  </Button>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Stack>
  );
}
