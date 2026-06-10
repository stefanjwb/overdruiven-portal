import { useState, useEffect, useMemo } from 'react';
import {
  Title, Text, Group, Badge, Paper, Table, Center, Loader, TextInput,
  Button, Modal, Stack, Textarea, ActionIcon, Tooltip, Switch, Image,
  FileButton, Pagination,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { usePagination } from '../../hooks/usePagination';
import { notifications } from '@mantine/notifications';
import { IconSearch, IconPlus, IconEdit, IconTrash, IconUpload, IconX } from '@tabler/icons-react';
import { getAllPosts, createPost, updatePost, deletePost } from '../../api/blog';
import dayjs from 'dayjs';
import 'dayjs/locale/nl';

dayjs.locale('nl');

const emptyForm = {
  title: '',
  content: '',
  image: null as string | null,
  published: false,
};

type FormState = typeof emptyForm;

function PostForm({ form, setForm }: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <Stack gap="sm">
      <TextInput
        label="Titel"
        withAsterisk
        placeholder="bijv. Verslag van onze Bourgogne-avond"
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.currentTarget.value }))}
      />
      <Textarea
        label="Inhoud"
        withAsterisk
        placeholder="Schrijf hier je blogpost..."
        value={form.content}
        onChange={e => setForm(f => ({ ...f, content: e.currentTarget.value }))}
        autosize
        minRows={8}
      />
      <div>
        <Text size="sm" fw={500} mb={4}>Afbeelding</Text>
        {form.image ? (
          <Stack gap="xs">
            <Image src={form.image} radius="md" mah={200} fit="contain" />
            <Button
              variant="subtle"
              color="red"
              size="xs"
              leftSection={<IconX size={14} />}
              onClick={() => setForm(f => ({ ...f, image: null }))}
            >
              Afbeelding verwijderen
            </Button>
          </Stack>
        ) : (
          <FileButton
            onChange={file => {
              if (!file) return;
              if (file.size > 15 * 1024 * 1024) {
                notifications.show({ message: 'Afbeelding mag maximaal 15 MB zijn.', color: 'red' });
                return;
              }
              const reader = new FileReader();
              reader.onload = e => setForm(f => ({ ...f, image: e.target?.result as string }));
              reader.readAsDataURL(file);
            }}
            accept="image/*"
          >
            {props => (
              <Button variant="light" color="brand" size="xs" leftSection={<IconUpload size={14} />} {...props}>
                Afbeelding uploaden
              </Button>
            )}
          </FileButton>
        )}
      </div>
      <Switch
        label="Publiceren"
        description="Gepubliceerde posts zijn voor alle bezoekers zichtbaar."
        checked={form.published}
        onChange={e => setForm(f => ({ ...f, published: e.currentTarget.checked }))}
        color="brand"
      />
    </Stack>
  );
}

export default function AdminBlog() {
  const [posts, setPosts] = useState<any[]>([]);
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
    getAllPosts().then(setPosts).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return posts;
    const q = debouncedSearch.toLowerCase();
    return posts.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
  }, [posts, debouncedSearch]);

  const { page, setPage, totalPages, paginated } = usePagination(filtered, [debouncedSearch]);

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.content.trim()) {
      notifications.show({ message: 'Titel en inhoud zijn verplicht.', color: 'red' });
      return;
    }
    setCreating(true);
    try {
      await createPost({
        title: createForm.title.trim(),
        content: createForm.content,
        image: createForm.image,
        published: createForm.published,
      });
      notifications.show({ message: createForm.published ? 'Blogpost geplaatst!' : 'Concept opgeslagen!', color: 'green' });
      setCreateOpen(false);
      setCreateForm(emptyForm);
      load();
    } catch {
      notifications.show({ message: 'Fout bij opslaan.', color: 'red' });
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (post: any) => {
    setEditTarget(post);
    setEditForm({
      title: post.title ?? '',
      content: post.content ?? '',
      image: post.image ?? null,
      published: post.published ?? false,
    });
  };

  const handleEdit = async () => {
    if (!editForm.title.trim() || !editForm.content.trim()) {
      notifications.show({ message: 'Titel en inhoud zijn verplicht.', color: 'red' });
      return;
    }
    setSaving(true);
    try {
      await updatePost(editTarget.id, {
        title: editForm.title.trim(),
        content: editForm.content,
        image: editForm.image,
        remove_image: editForm.image === null && editTarget.image !== null,
        published: editForm.published,
      });
      notifications.show({ message: 'Blogpost bijgewerkt!', color: 'green' });
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
      await deletePost(deleteTarget.id);
      notifications.show({ message: 'Blogpost verwijderd.', color: 'green' });
      setDeleteTarget(null);
      load();
    } catch {
      notifications.show({ message: 'Fout bij verwijderen.', color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  const togglePublished = async (post: any) => {
    try {
      await updatePost(post.id, { published: !post.published });
      notifications.show({
        message: post.published ? 'Blogpost teruggezet naar concept.' : 'Blogpost gepubliceerd!',
        color: 'green',
      });
      load();
    } catch {
      notifications.show({ message: 'Fout bij bijwerken.', color: 'red' });
    }
  };

  if (loading) return <Center py={80}><Loader color="brand" type="dots" /></Center>;

  return (
    <>
      <Title order={2} mb="lg">Blog</Title>

      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" mb="md">
          <Text fw={600}>
            {posts.length} {posts.length === 1 ? 'post' : 'posts'}
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
              Nieuwe post
            </Button>
          </Group>
        </Group>

        {filtered.length === 0 ? (
          <Text ta="center" c="dimmed" py="lg">
            {posts.length === 0 ? 'Nog geen blogposts.' : 'Geen resultaten.'}
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={500}>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Titel</Table.Th>
                  <Table.Th>Auteur</Table.Th>
                  <Table.Th>Datum</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th ta="right">Acties</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginated.map(post => (
                  <Table.Tr key={post.id}>
                    <Table.Td>
                      <Text size="sm" fw={500} lineClamp={1}>{post.title}</Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>{post.content}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{post.author_name ?? '—'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{dayjs(post.created_at).format('D MMM YYYY')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color={post.published ? 'green' : 'gray'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => togglePublished(post)}
                      >
                        {post.published ? 'Gepubliceerd' : 'Concept'}
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Group gap="xs" justify="flex-end">
                        <Tooltip label="Bewerken">
                          <ActionIcon variant="light" color="brand" onClick={() => openEdit(post)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Verwijderen">
                          <ActionIcon variant="light" color="red" onClick={() => setDeleteTarget(post)}>
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
        )}
        {totalPages > 1 && (
          <Group justify="center" mt="md">
            <Pagination value={page} onChange={setPage} total={totalPages} color="brand" size="sm" />
          </Group>
        )}
      </Paper>

      {/* Toevoegen */}
      <Modal opened={createOpen} onClose={() => { setCreateOpen(false); setCreateForm(emptyForm); }} title="Nieuwe blogpost" size="lg">
        <PostForm form={createForm} setForm={setCreateForm} />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setCreateOpen(false)}>Annuleren</Button>
          <Button color="brand" loading={creating} onClick={handleCreate}>
            {createForm.published ? 'Plaatsen' : 'Opslaan als concept'}
          </Button>
        </Group>
      </Modal>

      {/* Bewerken */}
      <Modal opened={!!editTarget} onClose={() => setEditTarget(null)} title="Blogpost bewerken" size="lg">
        <PostForm form={editForm} setForm={setEditForm} />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setEditTarget(null)}>Annuleren</Button>
          <Button color="brand" loading={saving} onClick={handleEdit}>Opslaan</Button>
        </Group>
      </Modal>

      {/* Verwijderen */}
      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Blogpost verwijderen" size="sm">
        {deleteTarget && (
          <Stack gap="md">
            <Text size="sm">Weet je zeker dat je <strong>{deleteTarget.title}</strong> wilt verwijderen?</Text>
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
