import { useEffect, useState } from 'react';
import {
  Container, Title, Paper, Stack, Button, TextInput, NumberInput, Textarea,
  FileInput, Modal, Table, Badge, Text, Group, ActionIcon, Loader, Center,
  Select, rem,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconReceipt, IconTrash, IconPlus } from '@tabler/icons-react';
import dayjs from 'dayjs';
import 'dayjs/locale/nl';
import { submitDeclaration, getMyDeclarations, deleteDeclaration } from '../api/declarations';
import { getAdminActivities, getInventory } from '../api/admin';

dayjs.locale('nl');

const STATUS: Record<string, { label: string; color: string }> = {
  pending:  { label: 'In behandeling', color: 'orange' },
  approved: { label: 'Goedgekeurd',    color: 'green'  },
  rejected: { label: 'Afgekeurd',      color: 'red'    },
};

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function Declarations() {
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [deletingId, setDeletingId]     = useState<number | null>(null);
  const [opened, { open, close }]       = useDisclosure(false);
  const [receiptFile, setReceiptFile]   = useState<File | null>(null);

  const [activities,  setActivities]  = useState<{ value: string; label: string }[]>([]);
  const [inventory,   setInventory]   = useState<{ value: string; label: string }[]>([]);

  const form = useForm({
    initialValues: {
      date:         null as Date | null,
      amount:       '' as number | string,
      article:      '',
      description:  '',
      bank_account: '',
      linked_to:    null as string | null,
      linked_id:    null as string | null,
    },
    validate: {
      date:         (v) => (v ? null : 'Vul een datum in'),
      amount:       (v) => (v && Number(v) > 0 ? null : 'Vul een bedrag in'),
      article:      (v) => (v.trim() ? null : 'Vul een artikel/omschrijving in'),
      bank_account: (v) => (v.trim() ? null : 'Vul je IBAN in'),
    },
  });

  const load = () => {
    setLoading(true);
    getMyDeclarations()
      .then(setDeclarations)
      .catch(() => notifications.show({ message: 'Laden mislukt.', color: 'red' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    getAdminActivities().then(data =>
      setActivities(data.map((a: any) => ({ value: String(a.id), label: `${a.name} (${dayjs(a.date).format('D MMM YYYY')})` })))
    ).catch(() => {});
    getInventory().then(data =>
      setInventory(data.map((i: any) => ({ value: String(i.id), label: i.name })))
    ).catch(() => {});
  }, []);

  const handleSubmit = async (values: typeof form.values) => {
    setSubmitting(true);
    try {
      let receipt: string | undefined;
      let receipt_filename: string | undefined;
      if (receiptFile) {
        receipt = await toBase64(receiptFile);
        receipt_filename = receiptFile.name;
      }
      await submitDeclaration({
        date:             dayjs(values.date).format('YYYY-MM-DD'),
        amount:           Number(values.amount),
        article:          values.article,
        description:      values.description || undefined,
        bank_account:     values.bank_account,
        receipt,
        receipt_filename,
        linked_to:        values.linked_to || undefined,
        linked_id:        values.linked_id ? Number(values.linked_id) : undefined,
      });
      notifications.show({ message: 'Declaratie ingediend!', color: 'green' });
      form.reset();
      setReceiptFile(null);
      close();
      load();
    } catch {
      notifications.show({ message: 'Indienen mislukt.', color: 'red' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteDeclaration(id);
      notifications.show({ message: 'Declaratie verwijderd.', color: 'green' });
      load();
    } catch {
      notifications.show({ message: 'Verwijderen mislukt.', color: 'red' });
    } finally {
      setDeletingId(null);
    }
  };

  const linkedToOptions = [
    { value: 'activity',  label: 'Les / activiteit' },
    { value: 'inventory', label: 'Inventaris'        },
    { value: 'other',     label: 'Overig'            },
  ];

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Mijn declaraties</Title>
        <Button color="brand" leftSection={<IconPlus size={16} />} onClick={open}>
          Nieuwe declaratie
        </Button>
      </Group>

      <Modal opened={opened} onClose={close} title="Nieuwe declaratie indienen" size="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <DateInput label="Datum" placeholder="Kies een datum" locale="nl" required {...form.getInputProps('date')} />
            <NumberInput label="Bedrag" placeholder="0,00" prefix="€ " decimalSeparator="," min={0.01} decimalScale={2} required {...form.getInputProps('amount')} />
            <TextInput label="Artikel / Omschrijving" placeholder="Wat heb je gekocht?" required {...form.getInputProps('article')} />
            <Textarea label="Toelichting (optioneel)" placeholder="Extra uitleg..." autosize minRows={2} {...form.getInputProps('description')} />
            <TextInput label="Rekeningnummer (IBAN)" placeholder="NL00 BANK 0000 0000 00" required {...form.getInputProps('bank_account')} />
            <Select
              label="Koppelen aan"
              placeholder="Selecteer (optioneel)"
              data={linkedToOptions}
              clearable
              {...form.getInputProps('linked_to')}
              onChange={(v) => { form.setFieldValue('linked_to', v); form.setFieldValue('linked_id', null); }}
            />
            {form.values.linked_to === 'activity' && (
              <Select label="Activiteit" placeholder="Kies een activiteit" data={activities} searchable clearable {...form.getInputProps('linked_id')} />
            )}
            {form.values.linked_to === 'inventory' && (
              <Select label="Inventarisitem" placeholder="Kies een item" data={inventory} searchable clearable {...form.getInputProps('linked_id')} />
            )}
            <FileInput
              label="Bonnetje (optioneel)"
              placeholder="Selecteer afbeelding of PDF"
              accept="image/*,application/pdf"
              leftSection={<IconReceipt size={rem(16)} />}
              value={receiptFile}
              onChange={setReceiptFile}
              clearable
            />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={close}>Annuleren</Button>
              <Button type="submit" color="brand" loading={submitting}>Indienen</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {loading ? (
        <Center h="40vh"><Loader color="brand" type="dots" size="lg" /></Center>
      ) : declarations.length === 0 ? (
        <Paper withBorder radius="md" p="xl">
          <Text c="dimmed" ta="center">Je hebt nog geen declaraties ingediend.</Text>
        </Paper>
      ) : (
        <Paper withBorder radius="md">
          {/* Desktop tabel */}
          <Table.ScrollContainer minWidth={600} visibleFrom="sm">
            <Table striped withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Datum</Table.Th>
                  <Table.Th>Artikel</Table.Th>
                  <Table.Th>Bedrag</Table.Th>
                  <Table.Th>Gekoppeld aan</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Opmerking</Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {declarations.map((d) => {
                  const s = STATUS[d.status] ?? { label: d.status, color: 'gray' };
                  return (
                    <Table.Tr key={d.id}>
                      <Table.Td><Text size="sm">{dayjs(d.date).format('D MMM YYYY')}</Text></Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>{d.article}</Text>
                        {d.description && <Text size="xs" c="dimmed">{d.description}</Text>}
                      </Table.Td>
                      <Table.Td><Text size="sm" fw={600}>€ {Number(d.amount).toFixed(2)}</Text></Table.Td>
                      <Table.Td>
                        {d.linked_label
                          ? <Text size="xs">{d.linked_label}</Text>
                          : d.linked_to === 'other'
                          ? <Text size="xs" c="dimmed">Overig</Text>
                          : <Text size="xs" c="dimmed">—</Text>}
                      </Table.Td>
                      <Table.Td><Badge color={s.color} variant="light">{s.label}</Badge></Table.Td>
                      <Table.Td>{d.admin_note && <Text size="xs" c="dimmed">{d.admin_note}</Text>}</Table.Td>
                      <Table.Td>
                        {d.status === 'pending' && (
                          <ActionIcon color="red" variant="subtle" size="sm" loading={deletingId === d.id} onClick={() => handleDelete(d.id)}>
                            <IconTrash size={14} />
                          </ActionIcon>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>

          {/* Mobiele kaartweergave */}
          <Stack gap="xs" p="xs" hiddenFrom="sm">
            {declarations.map((d) => {
              const s = STATUS[d.status] ?? { label: d.status, color: 'gray' };
              return (
                <div key={d.id} style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8, padding: '10px 12px' }}>
                  <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <div style={{ minWidth: 0 }}>
                      <Group gap="xs" wrap="wrap" mb={2}>
                        <Text size="sm" fw={600}>{d.article}</Text>
                        <Badge color={s.color} variant="light" size="xs">{s.label}</Badge>
                      </Group>
                      <Text size="sm" fw={700}>€ {Number(d.amount).toFixed(2)}</Text>
                      <Text size="xs" c="dimmed">{dayjs(d.date).format('D MMM YYYY')}</Text>
                      {d.linked_label && <Text size="xs" c="dimmed">{d.linked_label}</Text>}
                      {d.linked_to === 'other' && !d.linked_label && <Text size="xs" c="dimmed">Overig</Text>}
                      {d.description && <Text size="xs" c="dimmed">{d.description}</Text>}
                      {d.admin_note && <Text size="xs" c="red" mt={2}>{d.admin_note}</Text>}
                    </div>
                    {d.status === 'pending' && (
                      <ActionIcon color="red" variant="subtle" size="sm" loading={deletingId === d.id} onClick={() => handleDelete(d.id)} style={{ flexShrink: 0 }}>
                        <IconTrash size={14} />
                      </ActionIcon>
                    )}
                  </Group>
                </div>
              );
            })}
          </Stack>
        </Paper>
      )}
    </Container>
  );
}
