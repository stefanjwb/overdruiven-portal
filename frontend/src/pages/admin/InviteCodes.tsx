import { useState, useEffect, useMemo } from 'react';
import { Title, Text, Group, Stack, Button, Badge, ActionIcon, Tooltip, Modal, Select, Paper, Table, Center, Loader, CopyButton, TextInput, Code, Pagination } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { usePagination } from '../../hooks/usePagination';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconCopy, IconCheck, IconSearch, IconAlertTriangle } from '@tabler/icons-react';
import { getInviteCodes, createInviteCode, deleteInviteCode } from '../../api/admin';
import type { InviteCode } from '../../types';
import dayjs from 'dayjs';

export default function AdminInviteCodes() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 200);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRole, setNewRole] = useState('user');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InviteCode | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => { setLoading(true); getInviteCodes().then(setCodes).catch(()=>{}).finally(()=>setLoading(false)); };
  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return codes;
    const q = debouncedSearch.toLowerCase();
    return codes.filter(c => c.code.toLowerCase().includes(q) || c.role.includes(q));
  }, [codes, debouncedSearch]);

  const { page, setPage, totalPages, paginated } = usePagination(filtered, [debouncedSearch]);

  if (loading) return <Center py={80}><Loader color="brand" type="dots"/></Center>;

  return (
    <>
      <Title order={2} mb="lg">Uitnodigingscodes</Title>
      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" mb="md">
          <Text fw={600}>Alle codes ({filtered.length})</Text>
          <Group gap="sm">
            <TextInput placeholder="Zoeken…" leftSection={<IconSearch size={16}/>} value={search} onChange={e=>setSearch(e.currentTarget.value)} w={{base:'100%',sm:220}} />
            <Button color="brand" leftSection={<IconPlus size={16}/>} onClick={()=>setCreateOpen(true)}>Nieuwe code</Button>
          </Group>
        </Group>
        <Table.ScrollContainer minWidth={500}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead><Table.Tr><Table.Th>Code</Table.Th><Table.Th>Rol</Table.Th><Table.Th>Aangemaakt</Table.Th><Table.Th ta="right">Acties</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>
              {paginated.map(c => (
                <Table.Tr key={c.id}>
                  <Table.Td>
                    <CopyButton value={c.code}>{({copied,copy})=>(
                      <Tooltip label={copied?'Gekopieerd!':'Klik om te kopiëren'}>
                        <Code style={{cursor:'pointer',display:'inline-flex',alignItems:'center',gap:4}} onClick={copy}>
                          {c.code} {copied?<IconCheck size={12}/>:<IconCopy size={12}/>}
                        </Code>
                      </Tooltip>
                    )}</CopyButton>
                  </Table.Td>
                  <Table.Td><Badge color="brand" variant="light">{c.role}</Badge></Table.Td>
                  <Table.Td><Text size="sm" c="dimmed">{dayjs(c.created_at).format('DD MMM YYYY HH:mm')}</Text></Table.Td>
                  <Table.Td ta="right"><Tooltip label="Verwijderen"><ActionIcon variant="light" color="red" onClick={()=>setDeleteTarget(c)}><IconTrash size={16}/></ActionIcon></Tooltip></Table.Td>
                </Table.Tr>
              ))}
              {filtered.length===0&&<Table.Tr><Table.Td colSpan={4}><Text ta="center" c="dimmed" py="lg">Geen codes gevonden</Text></Table.Td></Table.Tr>}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        {totalPages > 1 && (
          <Group justify="center" mt="md">
            <Pagination value={page} onChange={setPage} total={totalPages} color="brand" size="sm" />
          </Group>
        )}
      </Paper>

      <Modal opened={createOpen} onClose={()=>setCreateOpen(false)} title="Nieuwe uitnodigingscode" size="sm">
        <Stack gap="md">
          <Select label="Rol" data={[{value:'user',label:'Lid'},{value:'organizer',label:'Organisator'},{value:'admin',label:'Admin'}]} value={newRole} onChange={v=>setNewRole(v||'user')} />
          <Text size="sm" c="dimmed">De gebruiker die zich met deze code registreert krijgt de geselecteerde rol.</Text>
          <Button fullWidth color="brand" loading={creating} onClick={async()=>{
            setCreating(true);
            try { await createInviteCode(newRole); notifications.show({message:'Code aangemaakt!',color:'green'}); setCreateOpen(false); load(); }
            catch { notifications.show({message:'Fout.',color:'red'}); }
            finally { setCreating(false); }
          }}>Genereren</Button>
        </Stack>
      </Modal>

      <Modal opened={!!deleteTarget} onClose={()=>setDeleteTarget(null)} title={<Group gap="sm"><IconAlertTriangle size={20} color="var(--mantine-color-red-6)"/><Text fw={700}>Verwijderen</Text></Group>} size="sm">
        {deleteTarget&&(<Stack gap="md"><Text size="sm">Weet je zeker dat je deze code wilt verwijderen?</Text><Code block>{deleteTarget.code}</Code><Group grow><Button variant="default" onClick={()=>setDeleteTarget(null)}>Annuleren</Button><Button color="red" loading={deleting} onClick={async()=>{
          setDeleting(true);
          try { await deleteInviteCode(deleteTarget.id); notifications.show({message:'Verwijderd.',color:'green'}); setDeleteTarget(null); load(); }
          catch { notifications.show({message:'Fout.',color:'red'}); }
          finally { setDeleting(false); }
        }}>Verwijderen</Button></Group></Stack>)}
      </Modal>
    </>
  );
}
