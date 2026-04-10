import { useState, useEffect, useMemo } from 'react';
import { Title, Text, Group, Stack, TextInput, PasswordInput, Select, Button, Badge, ActionIcon, Tooltip, Drawer, Modal, Paper, Table, Avatar, Center, Loader, Pagination, Code, CopyButton } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import { usePagination } from '../../hooks/usePagination';
import { notifications } from '@mantine/notifications';
import { IconSearch, IconEdit, IconTrash, IconShieldCheck, IconUserStar, IconUser, IconAt, IconLock, IconAlertTriangle, IconPlus, IconCopy, IconCheck } from '@tabler/icons-react';
import { getUsers, updateUser, deleteUser, createInviteCode } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import type { User } from '../../types';

const ROLES: Record<string, { color: string; icon: typeof IconUser; label: string }> = {
  admin: { color: 'red', icon: IconShieldCheck, label: 'Admin' },
  organizer: { color: 'brand', icon: IconUserStar, label: 'Organisator' },
  user: { color: 'blue', icon: IconUser, label: 'Lid' },
};

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 200);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteCreating, setInviteCreating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const form = useForm({
    initialValues: { username: '', email: '', role: '', password: '' },
    validate: {
      username: (v) => v.trim() ? null : 'Verplicht',
      email: (v) => /\S+@\S+/.test(v) ? null : 'Ongeldig',
      password: (v) => { if (!v) return null; if (v.length<8) return 'Min 8 tekens'; if (!/[A-Z]/.test(v)) return 'Hoofdletter vereist'; if (!/\d/.test(v)) return 'Cijfer vereist'; return null; },
    },
  });

  const load = () => { setLoading(true); getUsers().then(setUsers).catch(()=>{}).finally(()=>setLoading(false)); };
  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return users;
    const q = debouncedSearch.toLowerCase();
    return users.filter(u => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, debouncedSearch]);

  const { page, setPage, totalPages, paginated } = usePagination(filtered, [debouncedSearch]);

  const openEdit = (u: User) => { setEditUser(u); form.setValues({username:u.username,email:u.email,role:u.role,password:''}); form.clearErrors(); };

  const handleEdit = async (v: typeof form.values) => {
    if (!editUser) return; setSaving(true);
    try {
      const p: Record<string,string> = {};
      if (v.username!==editUser.username) p.username=v.username;
      if (v.email!==editUser.email) p.email=v.email;
      if (v.role!==editUser.role) p.role=v.role;
      if (v.password) p.password=v.password;
      if (!Object.keys(p).length) { notifications.show({message:'Niets gewijzigd.',color:'yellow'}); setSaving(false); return; }
      await updateUser(editUser.id, p);
      notifications.show({message:`${v.username} bijgewerkt!`,color:'green'});
      setEditUser(null); load();
    } catch (e:any) { notifications.show({message:e.response?.data?.detail||'Fout.',color:'red'}); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try { await deleteUser(deleteTarget.id); notifications.show({message:`${deleteTarget.username} verwijderd.`,color:'green'}); setDeleteTarget(null); load(); }
    catch (e:any) { notifications.show({message:e.response?.data?.detail||'Fout.',color:'red'}); }
    finally { setDeleting(false); }
  };

  if (loading) return <Center py={80}><Loader color="brand" type="dots"/></Center>;

  return (
    <>
      <Title order={2} mb="lg">Gebruikersbeheer</Title>
      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <Text fw={600}>Alle gebruikers ({filtered.length})</Text>
            <Tooltip label="Uitnodigingscode aanmaken">
              <ActionIcon variant="light" color="brand" size="sm" onClick={() => { setInviteRole('user'); setInviteOpen(true); }}>
                <IconPlus size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <TextInput placeholder="Zoeken…" leftSection={<IconSearch size={16}/>} value={search} onChange={e=>setSearch(e.currentTarget.value)} w={{base:'100%',sm:280}} />
        </Group>
        {/* Desktop tabel */}
        <Table.ScrollContainer minWidth={500} visibleFrom="sm">
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead><Table.Tr><Table.Th>Gebruiker</Table.Th><Table.Th>E-mail</Table.Th><Table.Th>Rol</Table.Th><Table.Th ta="right">Acties</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>
              {paginated.map(u => { const r=ROLES[u.role]||ROLES.user; const I=r.icon; return (
                <Table.Tr key={u.id}>
                  <Table.Td><Group gap="sm"><Avatar size={34} radius="xl" color={r.color}>{[u.first_name, u.last_name].filter(Boolean).map((n: string) => n[0].toUpperCase()).join('') || u.username.slice(0,2).toUpperCase()}</Avatar><div><Text size="sm" fw={500}>{u.first_name ? u.first_name.charAt(0).toUpperCase() + u.first_name.slice(1) : u.username}</Text>{u.username===me?.username&&<Text size="xs" c="dimmed">Jij</Text>}</div></Group></Table.Td>
                  <Table.Td><Text size="sm" c="dimmed">{u.email}</Text></Table.Td>
                  <Table.Td><Badge color={r.color} variant="light" leftSection={<I size={12}/>}>{r.label}</Badge></Table.Td>
                  <Table.Td ta="right">{u.username!==me?.username?(<Group gap={4} justify="flex-end"><Tooltip label="Bewerken"><ActionIcon variant="light" color="brand" onClick={()=>openEdit(u)}><IconEdit size={16}/></ActionIcon></Tooltip>{u.username!=='admin'&&<Tooltip label="Verwijderen"><ActionIcon variant="light" color="red" onClick={()=>setDeleteTarget(u)}><IconTrash size={16}/></ActionIcon></Tooltip>}</Group>):null}</Table.Td>
                </Table.Tr>); })}
              {filtered.length===0&&<Table.Tr><Table.Td colSpan={4}><Text ta="center" c="dimmed" py="lg">Geen resultaten</Text></Table.Td></Table.Tr>}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        {/* Mobiele kaartweergave */}
        <Stack gap="xs" hiddenFrom="sm">
          {paginated.length === 0 && <Text ta="center" c="dimmed" py="lg">Geen resultaten</Text>}
          {paginated.map(u => { const r=ROLES[u.role]||ROLES.user; const I=r.icon; return (
            <div key={u.id} style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8, padding: '10px 12px' }}>
              <Group justify="space-between" align="center" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <Avatar size={36} radius="xl" color={r.color} style={{ flexShrink: 0 }}>{[u.first_name, u.last_name].filter(Boolean).map((n: string) => n[0].toUpperCase()).join('') || u.username.slice(0,2).toUpperCase()}</Avatar>
                  <div style={{ minWidth: 0 }}>
                    <Group gap="xs" wrap="wrap">
                      <Text size="sm" fw={600} style={{ wordBreak: 'break-word' }}>{u.first_name ? u.first_name.charAt(0).toUpperCase() + u.first_name.slice(1) : u.username}</Text>
                      {u.username===me?.username && <Text size="xs" c="dimmed">(jij)</Text>}
                      <Badge color={r.color} variant="light" size="xs" leftSection={<I size={11}/>}>{r.label}</Badge>
                    </Group>
                    <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>{u.email}</Text>
                  </div>
                </Group>
                {u.username!==me?.username && (
                  <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
                    <ActionIcon variant="light" color="brand" size="sm" onClick={()=>openEdit(u)}><IconEdit size={14}/></ActionIcon>
                    {u.username!=='admin' && <ActionIcon variant="light" color="red" size="sm" onClick={()=>setDeleteTarget(u)}><IconTrash size={14}/></ActionIcon>}
                  </Group>
                )}
              </Group>
            </div>
          );})}
        </Stack>
        {totalPages > 1 && (
          <Group justify="center" mt="md">
            <Pagination value={page} onChange={setPage} total={totalPages} color="brand" size="sm" />
          </Group>
        )}
      </Paper>

      <Drawer opened={!!editUser} onClose={()=>setEditUser(null)} title={<Text fw={700}>Bewerk: {editUser?.username}</Text>} position="right" size="md" padding="xl">
        {editUser&&(<form onSubmit={form.onSubmit(handleEdit)}><Stack gap="md" mt="md">
          <TextInput label="Gebruikersnaam" leftSection={<IconUser size={16}/>} required disabled={editUser.username==='admin'} {...form.getInputProps('username')}/>
          <TextInput label="E-mail" leftSection={<IconAt size={16}/>} required {...form.getInputProps('email')}/>
          <Select label="Rol" leftSection={<IconShieldCheck size={16}/>} data={[{value:'user',label:'Lid'},{value:'organizer',label:'Organisator'},{value:'admin',label:'Admin'}]} disabled={editUser.username==='admin'} {...form.getInputProps('role')}/>
          <PasswordInput label="Nieuw wachtwoord" leftSection={<IconLock size={16}/>} placeholder="Leeg = behouden" description="Min 8 tekens, hoofdletter, cijfer" {...form.getInputProps('password')}/>
          <Button type="submit" fullWidth color="brand" loading={saving}>Opslaan</Button>
          <Button fullWidth variant="subtle" color="gray" onClick={()=>setEditUser(null)}>Annuleren</Button>
        </Stack></form>)}
      </Drawer>

      <Modal opened={!!deleteTarget} onClose={()=>setDeleteTarget(null)} title={<Group gap="sm"><IconAlertTriangle size={20} color="var(--mantine-color-red-6)"/><Text fw={700}>Verwijderen</Text></Group>} size="sm">
        {deleteTarget&&(<Stack gap="md"><Text size="sm">Weet je zeker dat je <b>{deleteTarget.username}</b> wilt verwijderen?</Text><Group grow><Button variant="default" onClick={()=>setDeleteTarget(null)}>Annuleren</Button><Button color="red" loading={deleting} onClick={handleDelete}>Verwijderen</Button></Group></Stack>)}
      </Modal>

      <Modal opened={inviteOpen} onClose={() => { setInviteOpen(false); setGeneratedCode(null); }} title="Uitnodigingscode aanmaken" size="sm">
        <Stack gap="md">
          {!generatedCode ? (
            <>
              <Select label="Rol" data={[{value:'user',label:'Lid'},{value:'organizer',label:'Organisator'},{value:'admin',label:'Admin'}]} value={inviteRole} onChange={v=>setInviteRole(v||'user')} />
              <Text size="sm" c="dimmed">De gebruiker die zich met deze code registreert krijgt de geselecteerde rol.</Text>
              <Group grow>
                <Button variant="default" onClick={() => setInviteOpen(false)}>Annuleren</Button>
                <Button color="brand" loading={inviteCreating} onClick={async () => {
                  setInviteCreating(true);
                  try {
                    const result = await createInviteCode(inviteRole);
                    setGeneratedCode(result.code);
                  }
                  catch { notifications.show({message:'Fout bij aanmaken.',color:'red'}); }
                  finally { setInviteCreating(false); }
                }}>Genereren</Button>
              </Group>
            </>
          ) : (
            <>
              <Text size="sm">De uitnodigingscode is aangemaakt. Deel deze code met de nieuwe gebruiker:</Text>
              <CopyButton value={generatedCode}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Gekopieerd!' : 'Klik om te kopiëren'}>
                    <Code
                      block
                      onClick={copy}
                      style={{ cursor: 'pointer', fontSize: 18, textAlign: 'center', letterSpacing: 2, padding: '12px 16px' }}
                    >
                      <Group justify="center" gap="xs">
                        {generatedCode}
                        {copied ? <IconCheck size={16} color="green" /> : <IconCopy size={16} />}
                      </Group>
                    </Code>
                  </Tooltip>
                )}
              </CopyButton>
              <Button color="brand" onClick={() => { setInviteOpen(false); setGeneratedCode(null); }}>Sluiten</Button>
            </>
          )}
        </Stack>
      </Modal>
    </>
  );
}
