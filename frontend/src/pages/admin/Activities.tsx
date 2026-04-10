import { useState, useEffect, useMemo } from 'react';
import { Title, Text, Group, Badge, Paper, Table, Center, Loader, TextInput, Progress, Button, Modal, Stack, Textarea, NumberInput, Select, Switch, ActionIcon, Tooltip, Tabs, Pagination } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useDebouncedValue } from '@mantine/hooks';
import { usePagination } from '../../hooks/usePagination';
import { notifications } from '@mantine/notifications';
import { IconSearch, IconCalendar, IconCalendarEvent, IconClockHour4, IconUsers, IconPlus, IconEdit, IconTrash, IconAlertTriangle, IconBottle } from '@tabler/icons-react';
import { getAdminActivities, getOrganizers, createActivity, updateActivity, deleteActivity } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import WinesModal from './Wines';
import dayjs from 'dayjs';
import 'dayjs/locale/nl';

const emptyForm = {
  name: '',
  description: '',
  date: null as Date | null,
  start_time: '',
  end_time: '',
  location: '',
  max_participants: '' as number | '',
  cost: '' as number | '',
  is_public: false,
  organizer_id: null as number | null,
  add_to_calendar: true,
};

type FormState = typeof emptyForm;

function activityToForm(a: any): FormState {
  return {
    name: a.name ?? '',
    description: a.description ?? '',
    date: a.date ? new Date(a.date) : null,
    start_time: a.start_time ?? '',
    end_time: a.end_time ?? '',
    location: a.location ?? '',
    max_participants: a.max_participants ?? '',
    cost: a.cost ?? '',
    is_public: a.is_public ?? false,
    organizer_id: a.organizer_id ?? null,
    add_to_calendar: true,
  };
}

function formToPayload(form: FormState, includeCalendar = false) {
  const payload: Record<string, any> = {
    name: form.name.trim(),
    description: form.description || null,
    date: form.date ? dayjs(form.date).format('YYYY-MM-DD') : '',
    start_time: form.start_time || null,
    end_time: form.end_time || null,
    location: form.location || null,
    max_participants: form.max_participants === '' ? null : form.max_participants,
    cost: form.cost === '' ? null : form.cost,
    is_public: form.is_public,
    organizer_id: form.organizer_id,
  };
  if (includeCalendar) payload.add_to_calendar = form.add_to_calendar;
  return payload;
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.currentTarget.value.replace(/[^0-9]/g, '');
    if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2, 4);
    onChange(v);
  };
  return (
    <TextInput
      label={label}
      placeholder="UU:MM"
      value={value}
      onChange={handle}
      maxLength={5}
    />
  );
}

function ActivityForm({ form, setForm, organizers, showCalendarOption = false }: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  organizers: {id: number; username: string}[];
  showCalendarOption?: boolean;
}) {
  return (
    <Stack gap="sm">
      <TextInput label="Naam" withAsterisk placeholder="Activiteitsnaam" value={form.name} onChange={e=>setForm(f=>({...f,name:e.currentTarget.value}))} />
      <Textarea label="Beschrijving" placeholder="Optionele beschrijving" value={form.description} onChange={e=>setForm(f=>({...f,description:e.currentTarget.value}))} autosize minRows={2} />
      <DateInput
        label="Datum"
        withAsterisk
        valueFormat="DD-MM-YYYY"
        placeholder="DD-MM-JJJJ"
        value={form.date}
        onChange={v => setForm(f => ({ ...f, date: v }))}
        locale="nl"
      />
      <Group grow>
        <TimeField label="Begintijd" value={form.start_time} onChange={v => setForm(f => ({ ...f, start_time: v }))} />
        <TimeField label="Eindtijd" value={form.end_time} onChange={v => setForm(f => ({ ...f, end_time: v }))} />
      </Group>
      <TextInput label="Locatie" placeholder="Optionele locatie" value={form.location} onChange={e=>setForm(f=>({...f,location:e.currentTarget.value}))} />
      <Group grow>
        <NumberInput label="Max. deelnemers" placeholder="Onbeperkt" min={1} value={form.max_participants} onChange={v=>setForm(f=>({...f,max_participants:v as number|''}))} />
        <NumberInput label="Kosten (€)" placeholder="Gratis" min={0} decimalScale={2} value={form.cost} onChange={v=>setForm(f=>({...f,cost:v as number|''}))} />
      </Group>
      {organizers.length > 0 && (
        <Select
          label="Organisator"
          placeholder="Selecteer organisator"
          clearable
          data={organizers.map(o=>({value:String(o.id),label:o.username}))}
          value={form.organizer_id ? String(form.organizer_id) : null}
          onChange={v=>setForm(f=>({...f,organizer_id:v?Number(v):null}))}
        />
      )}
      <Switch label="Publiek zichtbaar" checked={form.is_public} onChange={e=>setForm(f=>({...f,is_public:e.currentTarget.checked}))} color="brand" />
      {showCalendarOption && (
        <Switch label="Toevoegen aan Google Agenda" checked={form.add_to_calendar} onChange={e=>setForm(f=>({...f,add_to_calendar:e.currentTarget.checked}))} color="brand" leftSection={<IconCalendar size={16}/>} />
      )}
    </Stack>
  );
}

export default function AdminActivities() {
  const { isAdmin } = useAuth();
  const [acts, setActs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 200);
  const [organizers, setOrganizers] = useState<{id: number; username: string}[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [creating, setCreating] = useState(false);

  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [winesTarget, setWinesTarget] = useState<any | null>(null);

  const load = () => {
    setLoading(true);
    getAdminActivities().then(setActs).catch(()=>{}).finally(()=>setLoading(false));
  };

  useEffect(() => {
    load();
    getOrganizers().then(setOrganizers).catch(()=>{});
  }, []);

  const upcoming = useMemo(() => acts.filter(a => !a.is_past), [acts]);
  const past = useMemo(() => acts.filter(a => a.is_past), [acts]);

  const filtered = useMemo(() => {
    const base = acts;
    if (!debouncedSearch.trim()) return base;
    return base.filter(a => a.name.toLowerCase().includes(debouncedSearch.toLowerCase()));
  }, [acts, debouncedSearch]);

  const filteredUpcoming = useMemo(() => filtered.filter(a => !a.is_past), [filtered]);
  const filteredPast = useMemo(() => filtered.filter(a => a.is_past), [filtered]);

  const upcomingPag = usePagination(filteredUpcoming, [debouncedSearch]);
  const pastPag = usePagination(filteredPast, [debouncedSearch]);

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.date) {
      notifications.show({ message: 'Naam en datum zijn verplicht.', color: 'red' });
      return;
    }
    setCreating(true);
    try {
      await createActivity(formToPayload(createForm, true));
      notifications.show({ message: 'Activiteit aangemaakt!', color: 'green' });
      setCreateOpen(false);
      setCreateForm(emptyForm);
      load();
    } catch {
      notifications.show({ message: 'Fout bij aanmaken.', color: 'red' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteActivity(deleteTarget.id);
      notifications.show({ message: 'Activiteit verwijderd.', color: 'green' });
      setDeleteTarget(null);
      load();
    } catch {
      notifications.show({ message: 'Fout bij verwijderen.', color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (a: any) => {
    setEditTarget(a);
    setEditForm(activityToForm(a));
  };

  const handleEdit = async () => {
    if (!editForm.name.trim() || !editForm.date) {
      notifications.show({ message: 'Naam en datum zijn verplicht.', color: 'red' });
      return;
    }
    setSaving(true);
    try {
      await updateActivity(editTarget.id, formToPayload(editForm));
      notifications.show({ message: 'Activiteit bijgewerkt!', color: 'green' });
      setEditTarget(null);
      load();
    } catch {
      notifications.show({ message: 'Fout bij opslaan.', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Center py={80}><Loader color="brand" type="dots"/></Center>;

  return (
    <>
      <Title order={2} mb="lg">Activiteitenbeheer</Title>
      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" mb="md">
          <div />
          <Group gap="sm">
            <TextInput placeholder="Zoeken…" leftSection={<IconSearch size={16}/>} value={search} onChange={e=>setSearch(e.currentTarget.value)} w={{base:'100%',sm:260}} />
            <Button color="brand" leftSection={<IconPlus size={16}/>} onClick={()=>setCreateOpen(true)}>Nieuwe activiteit</Button>
          </Group>
        </Group>

        <Tabs defaultValue="upcoming" color="brand">
          <Tabs.List mb="md">
            <Tabs.Tab value="upcoming" leftSection={<IconCalendarEvent size={16}/>}>
              Komend ({filteredUpcoming.length})
            </Tabs.Tab>
            <Tabs.Tab value="past" leftSection={<IconClockHour4 size={16}/>}>
              Historie ({filteredPast.length})
            </Tabs.Tab>
          </Tabs.List>

          {(['upcoming', 'past'] as const).map(tab => {
            const pag = tab === 'upcoming' ? upcomingPag : pastPag;
            const allRows = tab === 'upcoming' ? filteredUpcoming : filteredPast;
            return (
              <Tabs.Panel key={tab} value={tab}>
                {/* Desktop tabel */}
                <Table.ScrollContainer minWidth={500} visibleFrom="sm">
                  <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Naam</Table.Th>
                        <Table.Th>Datum</Table.Th>
                        <Table.Th>Deelnemers</Table.Th>
                        <Table.Th ta="right">Acties</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {pag.paginated.map(a => {
                        const pct = a.max_participants ? Math.min(100,Math.round((a.signups_count/a.max_participants)*100)) : null;
                        return (
                          <Table.Tr key={a.id}>
                            <Table.Td><Text size="sm" fw={500}>{a.name}</Text></Table.Td>
                            <Table.Td><Text size="sm" c="dimmed">{dayjs(a.date).format('DD MMM YYYY')}</Text></Table.Td>
                            <Table.Td style={{width:130}}>
                              <Group gap={4}><IconUsers size={13} color="gray"/><Text size="xs" fw={600}>{a.signups_count}{a.max_participants?` / ${a.max_participants}`:''}</Text></Group>
                              {pct!==null&&<Progress value={pct} size="xs" radius="xl" mt={4} color={pct>=90?'red':pct>=60?'orange':'brand'}/>}
                            </Table.Td>
                            <Table.Td ta="right">
                              <Group gap="xs" justify="flex-end">
                                <Tooltip label="Wijnen"><ActionIcon variant="light" color="grape" onClick={()=>setWinesTarget(a)}><IconBottle size={16}/></ActionIcon></Tooltip>
                                <Tooltip label="Bewerken"><ActionIcon variant="light" color="brand" onClick={()=>openEdit(a)}><IconEdit size={16}/></ActionIcon></Tooltip>
                                {isAdmin && <Tooltip label="Verwijderen"><ActionIcon variant="light" color="red" onClick={()=>setDeleteTarget(a)}><IconTrash size={16}/></ActionIcon></Tooltip>}
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                      {allRows.length===0&&<Table.Tr><Table.Td colSpan={4}><Text ta="center" c="dimmed" py="lg">Geen activiteiten gevonden</Text></Table.Td></Table.Tr>}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>

                {/* Mobiele kaartweergave */}
                <Stack gap="xs" hiddenFrom="sm">
                  {allRows.length === 0 && <Text ta="center" c="dimmed" py="lg">Geen activiteiten gevonden</Text>}
                  {pag.paginated.map(a => {
                    const pct = a.max_participants ? Math.min(100,Math.round((a.signups_count/a.max_participants)*100)) : null;
                    return (
                      <div key={a.id} style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8, padding: '10px 12px' }}>
                        <Group justify="space-between" wrap="nowrap" align="flex-start">
                          <div style={{ minWidth: 0 }}>
                            <Text size="sm" fw={600}>{a.name}</Text>
                            <Text size="xs" c="dimmed">{dayjs(a.date).format('DD MMM YYYY')}</Text>
                            <Group gap={4} mt={4}>
                              <IconUsers size={13} color="gray"/>
                              <Text size="xs" fw={600}>{a.signups_count}{a.max_participants?` / ${a.max_participants}`:''}</Text>
                            </Group>
                            {pct!==null&&<Progress value={pct} size="xs" radius="xl" mt={4} color={pct>=90?'red':pct>=60?'orange':'brand'}/>}
                          </div>
                          <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
                            <ActionIcon variant="light" color="grape" size="sm" onClick={()=>setWinesTarget(a)}><IconBottle size={14}/></ActionIcon>
                            <ActionIcon variant="light" color="brand" size="sm" onClick={()=>openEdit(a)}><IconEdit size={14}/></ActionIcon>
                            {isAdmin && <ActionIcon variant="light" color="red" size="sm" onClick={()=>setDeleteTarget(a)}><IconTrash size={14}/></ActionIcon>}
                          </Group>
                        </Group>
                      </div>
                    );
                  })}
                </Stack>

                {pag.totalPages > 1 && (
                  <Group justify="center" mt="md">
                    <Pagination value={pag.page} onChange={pag.setPage} total={pag.totalPages} color="brand" size="sm" />
                  </Group>
                )}
              </Tabs.Panel>
            );
          })}
        </Tabs>
      </Paper>

      <Modal opened={createOpen} onClose={()=>{setCreateOpen(false);setCreateForm(emptyForm);}} title="Nieuwe activiteit" size="lg">
        <ActivityForm form={createForm} setForm={setCreateForm} organizers={organizers} showCalendarOption />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={()=>{setCreateOpen(false);setCreateForm(emptyForm);}}>Annuleren</Button>
          <Button color="brand" loading={creating} onClick={handleCreate}>Opslaan</Button>
        </Group>
      </Modal>

      <Modal opened={!!deleteTarget} onClose={()=>setDeleteTarget(null)} title={<Group gap="sm"><IconAlertTriangle size={20} color="var(--mantine-color-red-6)"/><Text fw={700}>Verwijderen</Text></Group>} size="sm">
        {deleteTarget && (
          <Stack gap="md">
            <Text size="sm">Weet je zeker dat je <strong>{deleteTarget.name}</strong> wilt verwijderen? Dit kan niet ongedaan worden gemaakt.</Text>
            <Group grow>
              <Button variant="default" onClick={()=>setDeleteTarget(null)}>Annuleren</Button>
              <Button color="red" loading={deleting} onClick={handleDelete}>Verwijderen</Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <WinesModal
        opened={!!winesTarget}
        onClose={() => setWinesTarget(null)}
        activityId={winesTarget?.id ?? 0}
        activityName={winesTarget?.name ?? ''}
      />

      <Modal opened={!!editTarget} onClose={()=>setEditTarget(null)} title="Activiteit bewerken" size="lg">
        <ActivityForm form={editForm} setForm={setEditForm} organizers={organizers} />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={()=>setEditTarget(null)}>Annuleren</Button>
          <Button color="brand" loading={saving} onClick={handleEdit}>Opslaan</Button>
        </Group>
      </Modal>
    </>
  );
}
