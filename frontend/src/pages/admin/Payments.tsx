import { useEffect, useState } from 'react';
import {
  Title, Text, Button, Group, Stack, Table, Loader, Center, Alert,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconCircleCheck, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getAdminPayments, approvePayment, rejectPayment } from '../../api/admin';
import dayjs from 'dayjs';
import 'dayjs/locale/nl';

dayjs.locale('nl');


export default function AdminPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    getAdminPayments()
      .then(setPayments)
      .catch(() => notifications.show({ message: 'Laden mislukt.', color: 'red' }))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleApprove = async (id: number) => {
    setActionId(id);
    try {
      await approvePayment(id);
      notifications.show({ message: 'Betaling goedgekeurd.', color: 'green' });
      load();
    } catch {
      notifications.show({ message: 'Goedkeuren mislukt.', color: 'red' });
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionId(id);
    try {
      await rejectPayment(id);
      notifications.show({ message: 'Betaling afgewezen.', color: 'orange' });
      load();
    } catch {
      notifications.show({ message: 'Afwijzen mislukt.', color: 'red' });
    } finally {
      setActionId(null);
    }
  };

  const pending = payments.filter(p => p.status === 'pending_verification');

  if (loading) return <Center h="40vh"><Loader color="brand" type="dots" size="lg" /></Center>;

  return (
    <Stack gap="xl">
      <Title order={2}>Openstaand</Title>

      {pending.length === 0 ? (
        <Alert icon={<IconCircleCheck size={16} />} color="green" variant="light">
          Alle betalingen zijn goedgekeurd.
        </Alert>
      ) : (
        <>
          <Alert icon={<IconAlertCircle size={16} />} color="orange" variant="light">
            {pending.length} betaling{pending.length !== 1 ? 'en' : ''} wacht{pending.length === 1 ? '' : 'en'} op goedkeuring.
          </Alert>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Gebruiker</Table.Th>
                <Table.Th>Activiteit</Table.Th>
                <Table.Th>Datum</Table.Th>
                <Table.Th>Bedrag</Table.Th>
                <Table.Th>Omschrijving</Table.Th>
                <Table.Th>Acties</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pending.map(p => {
                const isActing = actionId === p.id;
                return (
                  <Table.Tr key={p.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{p.username}</Text>
                      <Text size="xs" c="dimmed">{p.email}</Text>
                    </Table.Td>
                    <Table.Td><Text size="sm">{p.activity_name}</Text></Table.Td>
                    <Table.Td><Text size="sm">{dayjs(p.activity_date).format('D MMM YYYY')}</Text></Table.Td>
                    <Table.Td>
                      {p.pending_amount < p.total_amount ? (
                        <>
                          <Text size="sm" fw={600}>€ {Number(p.pending_amount).toFixed(2)}</Text>
                          <Text size="xs" c="dimmed">extra (al betaald: € {Number(p.total_amount - p.pending_amount).toFixed(2)})</Text>
                        </>
                      ) : (
                        <Text size="sm" fw={600}>€ {Number(p.total_amount ?? p.cost).toFixed(2)}</Text>
                      )}
                      {p.guests > 0 && <Text size="xs" c="dimmed">{1 + p.guests} personen</Text>}
                    </Table.Td>
                    <Table.Td><Text size="xs" ff="monospace">{p.reference}</Text></Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button size="xs" color="green" leftSection={<IconCheck size={14} />} loading={isActing} onClick={() => handleApprove(p.id)}>
                          Goedkeuren
                        </Button>
                        <Button size="xs" color="red" variant="light" leftSection={<IconX size={14} />} loading={isActing} onClick={() => handleReject(p.id)}>
                          Afwijzen
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </>
      )}
    </Stack>
  );
}
