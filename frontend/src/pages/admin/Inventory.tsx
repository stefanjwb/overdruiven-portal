import { useState, useEffect, useMemo } from 'react';
import {
  Title, Text, Group, Badge, Paper, Table, Center, Loader, TextInput,
  Button, Modal, Stack, Textarea, NumberInput, ActionIcon, Tooltip,
  Select, Pagination,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { usePagination } from '../../hooks/usePagination';
import { notifications } from '@mantine/notifications';
import { IconSearch, IconPlus, IconEdit, IconTrash, IconPackage } from '@tabler/icons-react';
import { getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem } from '../../api/admin';

const CATEGORIES = [
  'Boeken', 'Glazen', 'Servies', 'Wijn', 'Overig',
];

const emptyForm = {
  name: '',
  category: null as string | null,
  quantity: 1 as number | '',
  description: '',
  notes: '',
};

type FormState = typeof emptyForm;

function ItemForm({ form, setForm }: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <Stack gap="sm">
      <TextInput
        label="Naam"
        withAsterisk
        placeholder="bijv. Bordeauxglazen"
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.currentTarget.value }))}
      />
      <Group grow>
        <Select
          label="Categorie"
          placeholder="Selecteer of typ..."
          data={CATEGORIES}
          value={form.category}
          onChange={v => setForm(f => ({ ...f, category: v }))}
          clearable
          searchable
        />
        <NumberInput
          label="Aantal"
          withAsterisk
          min={0}
          value={form.quantity}
          onChange={v => setForm(f => ({ ...f, quantity: v as number | '' }))}
        />
      </Group>
      <Textarea
        label="Beschrijving"
        placeholder="Optionele beschrijving..."
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.currentTarget.value }))}
        autosize
        minRows={2}
      />
      <Textarea
        label="Notities"
        placeholder="bijv. opgeslagen in kast 2..."
        value={form.notes}
        onChange={e => setForm(f => ({ ...f, notes: e.currentTarget.value }))}
        autosize
        minRows={2}
      />
    </Stack>
  );
}

export default function AdminInventory() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 200);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [creating, setCreating] = useState(false);

  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    getInventory().then(setItems).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return items;
    const q = debouncedSearch.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q));
  }, [items, debouncedSearch]);

  const { page, setPage, totalPages, paginated } = usePagination(filtered, [debouncedSearch]);

  // Groepeer gepagineerde items op categorie
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const item of paginated) {
      const key = item.category ?? 'Overig';
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [paginated]);

  const handleCreate = async () => {
    if (!createForm.name.trim() || createForm.quantity === '') {
      notifications.show({ message: 'Naam en aantal zijn verplicht.', color: 'red' });
      return;
    }
    setCreating(true);
    try {
      await createInventoryItem({
        name: createForm.name.trim(),
        category: createForm.category || null,
        quantity: createForm.quantity,
        description: createForm.description || null,
        notes: createForm.notes || null,
      });
      notifications.show({ message: 'Item toegevoegd!', color: 'green' });
      setCreateOpen(false);
      setCreateForm(emptyForm);
      load();
    } catch {
      notifications.show({ message: 'Fout bij toevoegen.', color: 'red' });
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (item: any) => {
    setEditTarget(item);
    setEditForm({
      name: item.name ?? '',
      category: item.category ?? null,
      quantity: item.quantity ?? 1,
      description: item.description ?? '',
      notes: item.notes ?? '',
    });
  };

  const handleEdit = async () => {
    if (!editForm.name.trim() || editForm.quantity === '') {
      notifications.show({ message: 'Naam en aantal zijn verplicht.', color: 'red' });
      return;
    }
    setSaving(true);
    try {
      await updateInventoryItem(editTarget.id, {
        name: editForm.name.trim(),
        category: editForm.category || null,
        quantity: editForm.quantity,
        description: editForm.description || null,
        notes: editForm.notes || null,
      });
      notifications.show({ message: 'Item bijgewerkt!', color: 'green' });
      setEditTarget(null);
      load();
    } catch {
      notifications.show({ message: 'Fout bij opslaan.', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteInventoryItem(deleteTarget.id);
      notifications.show({ message: 'Item verwijderd.', color: 'green' });
      setDeleteTarget(null);
      load();
    } catch {
      notifications.show({ message: 'Fout bij verwijderen.', color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Center py={80}><Loader color="brand" type="dots" /></Center>;

  return (
    <>
      <Title order={2} mb="lg">Inventaris</Title>

      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" mb="md">
          <Text fw={600}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Text>
          <Group gap="sm">
            <TextInput
              placeholder="Zoeken..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={e => setSearch(e.currentTarget.value)}
              w={{ base: '100%', sm: 240 }}
            />
            <Button color="brand" leftSection={<IconPlus size={16} />} onClick={() => setCreateOpen(true)}>
              Item toevoegen
            </Button>
          </Group>
        </Group>

        {filtered.length === 0 ? (
          <Text ta="center" c="dimmed" py="lg">
            {items.length === 0 ? 'Nog geen items in de inventaris.' : 'Geen resultaten.'}
          </Text>
        ) : (
          <Stack gap="md">
            {grouped.map(([category, catItems]) => (
              <div key={category}>
                <Group gap="xs" mb="xs">
                  <IconPackage size={16} color="var(--mantine-color-brand-6)" />
                  <Text fw={600} size="sm" tt="uppercase" c="dimmed">{category}</Text>
                </Group>
                <Table.ScrollContainer minWidth={400}>
                  <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Naam</Table.Th>
                        <Table.Th>Aantal</Table.Th>
                        <Table.Th>Beschrijving</Table.Th>
                        <Table.Th ta="right">Acties</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {catItems.map(item => (
                        <Table.Tr key={item.id}>
                          <Table.Td>
                            <Text size="sm" fw={500}>{item.name}</Text>
                            {item.notes && <Text size="xs" c="dimmed">{item.notes}</Text>}
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="light" color={item.quantity === 0 ? 'red' : 'brand'}>
                              {item.quantity}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed" lineClamp={1}>{item.description ?? '—'}</Text>
                          </Table.Td>
                          <Table.Td ta="right">
                            <Group gap="xs" justify="flex-end">
                              <Tooltip label="Bewerken">
                                <ActionIcon variant="light" color="brand" onClick={() => openEdit(item)}>
                                  <IconEdit size={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Verwijderen">
                                <ActionIcon variant="light" color="red" onClick={() => setDeleteTarget(item)}>
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </div>
            ))}
          </Stack>
        )}
        {totalPages > 1 && (
          <Group justify="center" mt="md">
            <Pagination value={page} onChange={setPage} total={totalPages} color="brand" size="sm" />
          </Group>
        )}
      </Paper>

      {/* Toevoegen */}
      <Modal opened={createOpen} onClose={() => { setCreateOpen(false); setCreateForm(emptyForm); }} title="Item toevoegen" size="md">
        <ItemForm form={createForm} setForm={setCreateForm} />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setCreateOpen(false)}>Annuleren</Button>
          <Button color="brand" loading={creating} onClick={handleCreate}>Toevoegen</Button>
        </Group>
      </Modal>

      {/* Bewerken */}
      <Modal opened={!!editTarget} onClose={() => setEditTarget(null)} title="Item bewerken" size="md">
        <ItemForm form={editForm} setForm={setEditForm} />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setEditTarget(null)}>Annuleren</Button>
          <Button color="brand" loading={saving} onClick={handleEdit}>Opslaan</Button>
        </Group>
      </Modal>

      {/* Verwijderen */}
      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Item verwijderen" size="sm">
        {deleteTarget && (
          <Stack gap="md">
            <Text size="sm">Weet je zeker dat je <strong>{deleteTarget.name}</strong> wilt verwijderen?</Text>
            <Group grow>
              <Button variant="default" onClick={() => setDeleteTarget(null)}>Annuleren</Button>
              <Button color="red" loading={deleting} onClick={handleDelete}>Verwijderen</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}
