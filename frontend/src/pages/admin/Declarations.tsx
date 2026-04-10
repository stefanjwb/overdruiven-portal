import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Title, Text, Badge, Button, Stack, Loader, Center, Accordion,
  Group, Modal, Textarea, Image, Drawer, Divider, ScrollArea, Tabs, TextInput,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconReceipt, IconSearch, IconCalendarEvent, IconPackage, IconCategory } from '@tabler/icons-react';
import { getAdminDeclarations, updateDeclarationStatus, deleteDeclaration } from '../../api/declarations';
import dayjs from 'dayjs';
import 'dayjs/locale/nl';

dayjs.locale('nl');

const STATUS: Record<string, { label: string; color: string }> = {
  pending:  { label: 'In behandeling', color: 'orange' },
  approved: { label: 'Goedgekeurd',    color: 'green'  },
  rejected: { label: 'Afgekeurd',      color: 'red'    },
};

function DeclarationCard({ d, onDetails }: { d: any; onDetails: (d: any) => void }) {
  const s = STATUS[d.status] ?? { label: d.status, color: 'gray' };
  return (
    <div style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8, padding: '10px 12px' }}>
      <Group justify="space-between" wrap="nowrap">
        <div style={{ minWidth: 0 }}>
          <Group gap="xs" wrap="wrap" mb={2}>
            <Text size="sm" fw={600}>{d.username}</Text>
            <Badge color={s.color} variant="light" size="xs">{s.label}</Badge>
          </Group>
          <Text size="sm">{d.article}</Text>
          <Group gap="xs">
            <Text size="sm" fw={700}>€ {Number(d.amount).toFixed(2)}</Text>
            <Text size="xs" c="dimmed">{dayjs(d.date).format('D MMM YYYY')}</Text>
          </Group>
          {d.admin_note && <Text size="xs" c="red" mt={2}>{d.admin_note}</Text>}
        </div>
        <Button size="xs" variant="light" color="brand" onClick={() => onDetails(d)} style={{ flexShrink: 0 }}>
          Details
        </Button>
      </Group>
    </div>
  );
}

export default function AdminDeclarations() {
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [actionId, setActionId]         = useState<number | null>(null);
  const [searchParams] = useSearchParams();
  const [search, setSearch]             = useState(() => searchParams.get('q') ?? '');

  const [detail, setDetail] = useState<any | null>(null);
  const [drawerOpen, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);

  const [rejectModal, { open: openReject, close: closeReject }] = useDisclosure(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const [receiptModal, { open: openReceipt, close: closeReceipt }] = useDisclosure(false);
  const [receiptData, setReceiptData] = useState<{ data: string; filename: string } | null>(null);

  const load = () => {
    setLoading(true);
    getAdminDeclarations()
      .then(setDeclarations)
      .catch(() => notifications.show({ message: 'Laden mislukt.', color: 'red' }))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleApprove = async (id: number) => {
    setActionId(id);
    try {
      await updateDeclarationStatus(id, 'approved');
      notifications.show({ message: 'Declaratie goedgekeurd.', color: 'green' });
      closeDrawer();
      load();
    } catch {
      notifications.show({ message: 'Goedkeuren mislukt.', color: 'red' });
    } finally { setActionId(null); }
  };

  const openRejectModal = (id: number) => { setRejectId(id); setAdminNote(''); openReject(); };

  const handleReject = async () => {
    if (!rejectId) return;
    setActionId(rejectId);
    try {
      await updateDeclarationStatus(rejectId, 'rejected', adminNote || undefined);
      notifications.show({ message: 'Declaratie afgekeurd.', color: 'orange' });
      closeReject(); closeDrawer(); load();
    } catch {
      notifications.show({ message: 'Afkeuren mislukt.', color: 'red' });
    } finally { setActionId(null); }
  };

  const handleDelete = async (id: number) => {
    setActionId(id);
    try {
      await deleteDeclaration(id);
      notifications.show({ message: 'Declaratie verwijderd.', color: 'green' });
      closeDrawer(); load();
    } catch {
      notifications.show({ message: 'Verwijderen mislukt.', color: 'red' });
    } finally { setActionId(null); }
  };

  const openDetail = (d: any) => { setDetail(d); openDrawer(); };

  // Gefilterde declaraties op zoekterm
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return declarations;
    return declarations.filter(d =>
      d.username?.toLowerCase().includes(q) ||
      d.article?.toLowerCase().includes(q) ||
      d.linked_label?.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q)
    );
  }, [declarations, search]);

  // Splits op categorie
  const lessons   = useMemo(() => filtered.filter(d => d.linked_to === 'activity'), [filtered]);
  const inventory = useMemo(() => filtered.filter(d => d.linked_to === 'inventory'), [filtered]);
  const other     = useMemo(() => filtered.filter(d => !d.linked_to || d.linked_to === 'other'), [filtered]);

  // Groepeer lessen per activiteit
  const lessonsByActivity = useMemo(() => {
    const map: Record<string, { label: string; items: any[] }> = {};
    for (const d of lessons) {
      const key = String(d.linked_id ?? 'onbekend');
      if (!map[key]) map[key] = { label: d.linked_label ?? 'Onbekende activiteit', items: [] };
      map[key].items.push(d);
    }
    return Object.entries(map);
  }, [lessons]);

  if (loading) return <Center h="40vh"><Loader color="brand" type="dots" size="lg" /></Center>;

  const pendingCount = declarations.filter(d => d.status === 'pending').length;

  return (
    <>
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <Title order={2}>Declaraties</Title>
          {pendingCount > 0 && (
            <Badge color="orange" variant="filled" size="lg">{pendingCount} openstaand</Badge>
          )}
        </Group>

        <TextInput
          placeholder="Zoek op naam, artikel of activiteit..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={e => setSearch(e.currentTarget.value)}
          style={{ maxWidth: 400 }}
        />

        <Tabs defaultValue="lessons" color="brand">
          <Tabs.List mb="md">
            <Tabs.Tab value="lessons" leftSection={<IconCalendarEvent size={16} />}>
              Wijnlessen ({lessons.length})
            </Tabs.Tab>
            <Tabs.Tab value="inventory" leftSection={<IconPackage size={16} />}>
              Inventaris ({inventory.length})
            </Tabs.Tab>
            <Tabs.Tab value="other" leftSection={<IconCategory size={16} />}>
              Overig ({other.length})
            </Tabs.Tab>
          </Tabs.List>

          {/* Wijnlessen tab — gegroepeerd per activiteit */}
          <Tabs.Panel value="lessons">
            {lessonsByActivity.length === 0 ? (
              <Text c="dimmed">Geen declaraties gevonden.</Text>
            ) : (
              <Accordion variant="separated" chevronPosition="right">
                {lessonsByActivity.map(([key, group]) => {
                  const pending = group.items.filter(d => d.status === 'pending').length;
                  const total   = group.items.reduce((s, d) => s + Number(d.amount), 0);
                  return (
                    <Accordion.Item key={key} value={key}>
                      <Accordion.Control>
                        <Group justify="space-between" pr="md">
                          <Text fw={600}>{group.label}</Text>
                          <Group gap="xs">
                            {pending > 0 && <Badge color="orange" variant="light">{pending} openstaand</Badge>}
                            <Badge color="brand" variant="light">€ {total.toFixed(2)}</Badge>
                            <Badge color="gray" variant="light">{group.items.length}</Badge>
                          </Group>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap="xs">
                          {group.items.map(d => (
                            <DeclarationCard key={d.id} d={d} onDetails={openDetail} />
                          ))}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  );
                })}
              </Accordion>
            )}
          </Tabs.Panel>

          {/* Inventaris tab */}
          <Tabs.Panel value="inventory">
            {inventory.length === 0 ? (
              <Text c="dimmed">Geen declaraties gevonden.</Text>
            ) : (
              <Stack gap="xs">
                {inventory.map(d => <DeclarationCard key={d.id} d={d} onDetails={openDetail} />)}
              </Stack>
            )}
          </Tabs.Panel>

          {/* Overig tab */}
          <Tabs.Panel value="other">
            {other.length === 0 ? (
              <Text c="dimmed">Geen declaraties gevonden.</Text>
            ) : (
              <Stack gap="xs">
                {other.map(d => <DeclarationCard key={d.id} d={d} onDetails={openDetail} />)}
              </Stack>
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Detail drawer */}
      <Drawer
        opened={drawerOpen}
        onClose={closeDrawer}
        title={<Text fw={700}>Declaratie details</Text>}
        position="right"
        size="md"
        scrollAreaComponent={ScrollArea.Autosize}
      >
        {detail && (
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Text fw={600}>{detail.username}</Text>
                <Text size="xs" c="dimmed">{detail.email}</Text>
              </div>
              <Badge color={STATUS[detail.status]?.color ?? 'gray'} variant="light">
                {STATUS[detail.status]?.label ?? detail.status}
              </Badge>
            </Group>

            <Divider />

            <Group grow>
              <div>
                <Text size="xs" c="dimmed">Datum</Text>
                <Text size="sm">{dayjs(detail.date).format('D MMMM YYYY')}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Bedrag</Text>
                <Text size="sm" fw={700}>€ {Number(detail.amount).toFixed(2)}</Text>
              </div>
            </Group>

            <div>
              <Text size="xs" c="dimmed">Artikel</Text>
              <Text size="sm">{detail.article}</Text>
            </div>

            {detail.description && (
              <div>
                <Text size="xs" c="dimmed">Toelichting</Text>
                <Text size="sm">{detail.description}</Text>
              </div>
            )}

            <div>
              <Text size="xs" c="dimmed">Rekeningnummer (IBAN)</Text>
              <Text size="sm" ff="monospace">{detail.bank_account}</Text>
            </div>

            {detail.linked_to && (
              <div>
                <Text size="xs" c="dimmed">Gekoppeld aan</Text>
                <Text size="sm">
                  {detail.linked_to === 'activity' ? 'Wijnles' : detail.linked_to === 'inventory' ? 'Inventaris' : 'Overig'}
                  {detail.linked_label ? `: ${detail.linked_label}` : ''}
                </Text>
              </div>
            )}

            {detail.admin_note && (
              <div>
                <Text size="xs" c="dimmed">Admin opmerking</Text>
                <Text size="sm" c="red">{detail.admin_note}</Text>
              </div>
            )}

            {detail.receipt && (
              <Button variant="light" color="brand" leftSection={<IconReceipt size={16} />}
                onClick={() => { setReceiptData({ data: detail.receipt, filename: detail.receipt_filename ?? 'bonnetje' }); openReceipt(); }}>
                Bekijk bonnetje
              </Button>
            )}

            <Divider />

            {detail.status === 'pending' && (
              <Group grow>
                <Button color="green" leftSection={<IconCheck size={16} />}
                  loading={actionId === detail.id} onClick={() => handleApprove(detail.id)}>
                  Goedkeuren
                </Button>
                <Button color="red" variant="light" leftSection={<IconX size={16} />}
                  loading={actionId === detail.id} onClick={() => openRejectModal(detail.id)}>
                  Afkeuren
                </Button>
              </Group>
            )}

            <Button color="red" variant="subtle" loading={actionId === detail.id}
              onClick={() => handleDelete(detail.id)}>
              Declaratie verwijderen
            </Button>
          </Stack>
        )}
      </Drawer>

      {/* Reject modal */}
      <Modal opened={rejectModal} onClose={closeReject} title="Declaratie afkeuren" size="sm">
        <Stack gap="md">
          <Textarea label="Reden (optioneel)" placeholder="Geef een toelichting..." autosize minRows={3}
            value={adminNote} onChange={e => setAdminNote(e.currentTarget.value)} />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeReject}>Annuleren</Button>
            <Button color="red" loading={actionId === rejectId} onClick={handleReject}>Afkeuren</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Receipt modal */}
      <Modal opened={receiptModal} onClose={closeReceipt} title={`Bonnetje: ${receiptData?.filename ?? ''}`} size="lg">
        {receiptData && (
          receiptData.filename?.toLowerCase().endsWith('.pdf') ? (
            <Stack gap="sm">
              <Text size="sm" c="dimmed">PDF kan niet inline worden weergegeven.</Text>
              <Button component="a" href={receiptData.data} download={receiptData.filename} color="brand" variant="light">
                Download PDF
              </Button>
            </Stack>
          ) : (
            <Image src={receiptData.data} alt="Bonnetje" fit="contain" mah={600} />
          )
        )}
      </Modal>
    </>
  );
}
