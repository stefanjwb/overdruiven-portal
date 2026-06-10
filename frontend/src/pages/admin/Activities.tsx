import { useState, useEffect, useMemo } from 'react';
import { Title, Text, Group, Badge, Paper, Table, Center, Loader, TextInput, Progress, Button, Modal, Stack, Textarea, NumberInput, Select, MultiSelect, Switch, ActionIcon, Tooltip, Tabs, Pagination, Anchor, Divider } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useDebouncedValue } from '@mantine/hooks';
import { usePagination } from '../../hooks/usePagination';
import { notifications } from '@mantine/notifications';
import { IconSearch, IconCalendarEvent, IconClockHour4, IconUsers, IconPlus, IconEdit, IconTrash, IconAlertTriangle, IconBottle, IconUserMinus, IconX } from '@tabler/icons-react';
import { getAdminActivities, getOrganizers, createActivity, updateActivity, deleteActivity, adminAddSignup, adminDeleteSignup, adminDeleteGuest, getActivitySignups, getUsers } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import WinesModal from './Wines';
import { useNavigate } from 'react-router-dom';
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
  shopper_id: null as number | null,
  cook_ids: [] as number[],
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
    shopper_id: a.shopper_id ?? null,
    cook_ids: a.cook_ids ?? [],
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
    shopper_id: form.shopper_id,
    cook_ids: form.cook_ids,
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
      {organizers.length > 0 && (
        <Group grow align="flex-start">
          <Select
            label="Boodschappen"
            placeholder="Wie doet boodschappen?"
            clearable
            searchable
            data={organizers.map(o=>({value:String(o.id),label:o.username}))}
            value={form.shopper_id ? String(form.shopper_id) : null}
            onChange={v=>setForm(f=>({...f,shopper_id:v?Number(v):null}))}
          />
          <MultiSelect
            label="Koks"
            placeholder={form.cook_ids.length === 0 ? 'Wie gaan er koken?' : ''}
            clearable
            searchable
            data={organizers.map(o=>({value:String(o.id),label:o.username}))}
            value={form.cook_ids.map(String)}
            onChange={vals=>setForm(f=>({...f,cook_ids:vals.map(Number)}))}
          />
        </Group>
      )}
      <Switch label="Publiek zichtbaar" checked={form.is_public} onChange={e=>setForm(f=>({...f,is_public:e.currentTarget.checked}))} color="brand" />
      {showCalendarOption && (
        <Switch label="Toevoegen aan Google Agenda" checked={form.add_to_calendar} onChange={e=>setForm(f=>({...f,add_to_calendar:e.currentTarget.checked}))} color="brand" />
      )}
    </Stack>
  );
}

export default function AdminActivities() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [acts, setActs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 200);
  const [organizers, setOrganizers] = useState<{id: number; username: string}[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [creating, setCreating] = useState(false);

  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [winesTarget, setWinesTarget] = useState<any | null>(null);

  // Gecombineerde deelnemers modal
  const [membersTarget, setMembersTarget] = useState<any | null>(null);
  const [signups, setSignups] = useState<any[]>([]);
  const [signupsLoading, setSignupsLoading] = useState(false);
  const [deletingSignupId, setDeletingSignupId] = useState<number | null>(null);
  const [deletingGuest, setDeletingGuest] = useState<{ signupId: number; index: number } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [addingUser, setAddingUser] = useState(false);

  const load = () => {
    setLoading(true);
    getAdminActivities().then(setActs).catch(()=>{}).finally(()=>setLoading(false));
  };

  useEffect(() => {
    load();
    getOrganizers().then(setOrganizers).catch(()=>{});
    getUsers().then(setAllUsers).catch(()=>{});
  }, []);

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return acts;
    return acts.filter(a => a.name.toLowerCase().includes(debouncedSearch.toLowerCase()));
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

  const openMembers = (a: any) => {
    setMembersTarget(a);
    setSelectedUserId(null);
    setSignupsLoading(true);
    getActivitySignups(a.id).then(setSignups).catch(()=>setSignups([])).finally(()=>setSignupsLoading(false));
  };

  const handleDeleteSignup = async (signupId: number) => {
    setDeletingSignupId(signupId);
    try {
      await adminDeleteSignup(signupId);
      setSignups(prev => prev.filter(s => s.id !== signupId));
      load();
      notifications.show({ message: 'Deelnemer verwijderd van activiteit.', color: 'green' });
    } catch {
      notifications.show({ message: 'Fout bij verwijderen van deelnemer.', color: 'red' });
    } finally {
      setDeletingSignupId(null);
    }
  };

  const handleDeleteGuest = async (signupId: number, guestIndex: number) => {
    setDeletingGuest({ signupId, index: guestIndex });
    try {
      await adminDeleteGuest(signupId, guestIndex);
      setSignups(prev => prev.map(s => {
        if (s.id !== signupId) return s;
        const names = [...(s.guest_names ?? [])];
        names.splice(guestIndex, 1);
        return { ...s, guests: names.length, guest_names: names };
      }));
      load();
      notifications.show({ message: 'Gast verwijderd.', color: 'green' });
    } catch {
      notifications.show({ message: 'Fout bij verwijderen van gast.', color: 'red' });
    } finally {
      setDeletingGuest(null);
    }
  };

  const handleAddUser = async () => {
    if (!selectedUserId) return;
    setAddingUser(true);
    try {
      await adminAddSignup(membersTarget.id, Number(selectedUserId));
      notifications.show({ message: 'Gebruiker toegevoegd aan activiteit!', color: 'green' });
      setSelectedUserId(null);
      load();
      // Ververs deelnemerslijst
      getActivitySignups(membersTarget.id).then(setSignups).catch(()=>{});
    } catch (e: any) {
      notifications.show({ message: e?.response?.data?.detail ?? 'Fout bij toevoegen.', color: 'red' });
    } finally {
      setAddingUser(false);
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
                            <Table.Td><Anchor size="sm" fw={500} onClick={()=>navigate(`/activiteiten/${a.id}`)} style={{cursor:'pointer'}}>{a.name}</Anchor></Table.Td>
                            <Table.Td><Text size="sm" c="dimmed">{dayjs(a.date).format('DD MMM YYYY')}</Text></Table.Td>
                            <Table.Td style={{width:130}}>
                              <Group gap={4}><IconUsers size={13} color="gray"/><Text size="xs" fw={600}>{a.signups_count}{a.max_participants?` / ${a.max_participants}`:''}</Text></Group>
                              {pct!==null&&<Progress value={pct} size="xs" radius="xl" mt={4} color={pct>=90?'red':pct>=60?'orange':'brand'}/>}
                            </Table.Td>
                            <Table.Td ta="right">
                              <Group gap="xs" justify="flex-end">
                                <Tooltip label="Wijnen"><ActionIcon variant="light" color="grape" onClick={()=>setWinesTarget(a)}><IconBottle size={16}/></ActionIcon></Tooltip>
                                <Tooltip label="Deelnemers"><ActionIcon variant="light" color="teal" onClick={()=>openMembers(a)}><IconUsers size={16}/></ActionIcon></Tooltip>
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
                            <Anchor size="sm" fw={600} onClick={()=>navigate(`/activiteiten/${a.id}`)} style={{cursor:'pointer'}}>{a.name}</Anchor>
                            <Text size="xs" c="dimmed">{dayjs(a.date).format('DD MMM YYYY')}</Text>
                            <Group gap={4} mt={4}>
                              <IconUsers size={13} color="gray"/>
                              <Text size="xs" fw={600}>{a.signups_count}{a.max_participants?` / ${a.max_participants}`:''}</Text>
                            </Group>
                            {pct!==null&&<Progress value={pct} size="xs" radius="xl" mt={4} color={pct>=90?'red':pct>=60?'orange':'brand'}/>}
                          </div>
                          <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
                            <ActionIcon variant="light" color="grape" size="sm" onClick={()=>setWinesTarget(a)}><IconBottle size={14}/></ActionIcon>
                            <ActionIcon variant="light" color="teal" size="sm" onClick={()=>openMembers(a)}><IconUsers size={14}/></ActionIcon>
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

      {/* Nieuwe activiteit */}
      <Modal opened={createOpen} onClose={()=>{setCreateOpen(false);setCreateForm(emptyForm);}} title="Nieuwe activiteit" size="lg">
        <ActivityForm form={createForm} setForm={setCreateForm} organizers={organizers} showCalendarOption />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={()=>{setCreateOpen(false);setCreateForm(emptyForm);}}>Annuleren</Button>
          <Button color="brand" loading={creating} onClick={handleCreate}>Opslaan</Button>
        </Group>
      </Modal>

      {/* Activiteit verwijderen */}
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

      {/* Wijnen */}
      <WinesModal
        opened={!!winesTarget}
        onClose={() => setWinesTarget(null)}
        activityId={winesTarget?.id ?? 0}
        activityName={winesTarget?.name ?? ''}
      />

      {/* Gecombineerde deelnemers modal */}
      <Modal
        opened={!!membersTarget}
        onClose={()=>setMembersTarget(null)}
        title={<Group gap="xs"><IconUsers size={18}/><Text fw={600}>Deelnemers — {membersTarget?.name ?? ''}</Text></Group>}
        size="md"
      >
        <Stack gap="md">
          {/* Deelnemerslijst */}
          {signupsLoading ? (
            <Center py="md"><Loader color="brand" type="dots" /></Center>
          ) : signups.length === 0 ? (
            <Text c="dimmed" ta="center" size="sm">Nog geen aanmeldingen.</Text>
          ) : (
            <Stack gap="xs">
              {signups.map(s => (
                <div key={s.id} style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8, overflow: 'hidden' }}>
                  {/* Hoofddeelnemer */}
                  <Group justify="space-between" wrap="nowrap" px="sm" py={8} style={{ background: 'var(--mantine-color-default-hover)' }}>
                    <Text size="sm" fw={600}>{s.participant_name}</Text>
                    <Tooltip label="Verwijder van activiteit">
                      <ActionIcon variant="subtle" color="red" size="sm" loading={deletingSignupId === s.id} onClick={()=>handleDeleteSignup(s.id)}>
                        <IconUserMinus size={15} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                  {/* Gasten */}
                  {(s.guest_names ?? []).map((name: string, i: number) => (
                    <Group key={i} justify="space-between" wrap="nowrap" px="sm" py={6} style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                      <Text size="xs" c="dimmed">↳ {name}</Text>
                      <Tooltip label="Gast verwijderen">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          loading={deletingGuest?.signupId === s.id && deletingGuest?.index === i}
                          onClick={()=>handleDeleteGuest(s.id, i)}
                        >
                          <IconX size={13} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  ))}
                </div>
              ))}
            </Stack>
          )}

          <Divider label="Deelnemer toevoegen" labelPosition="center" />

          {/* Deelnemer toevoegen */}
          <Text size="xs" c="dimmed">Bij een activiteit met kosten wordt de betaling automatisch als voldaan gemarkeerd.</Text>
          <Group gap="sm" align="flex-end">
            <Select
              label="Lid"
              placeholder="Selecteer een lid"
              searchable
              style={{ flex: 1 }}
              data={allUsers.map((u: any) => ({ value: String(u.id), label: u.username }))}
              value={selectedUserId}
              onChange={setSelectedUserId}
            />
            <Button color="teal" loading={addingUser} disabled={!selectedUserId} onClick={handleAddUser} mb={1}>
              Toevoegen
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Activiteit bewerken */}
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
