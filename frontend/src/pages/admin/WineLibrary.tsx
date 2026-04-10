import { useEffect, useState, useMemo } from 'react';
import {
  Title, Text, Badge, Button, Stack, Loader, Center, Accordion, Group,
  ActionIcon, Tooltip, Modal, TextInput, Table,
  NumberInput, Select, Textarea, TagsInput, Switch, Divider, Image, FileButton,
} from '@mantine/core';
import {
  IconEdit, IconTrash, IconPlus, IconEye, IconEyeOff, IconHome, IconSearch, IconUpload, IconX, IconPhoto,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getAllWinesAdmin, createWine, updateWine, deleteWine } from '../../api/wines';
import dayjs from 'dayjs';
import 'dayjs/locale/nl';

dayjs.locale('nl');

const WINE_TYPES = [
  { value: 'rood', label: 'Rood' },
  { value: 'wit', label: 'Wit' },
  { value: 'rosé', label: 'Rosé' },
  { value: 'oranje', label: 'Oranje' },
  { value: 'mousserende', label: 'Mousserende' },
  { value: 'zoet', label: 'Zoet' },
];

const BODY_OPTIONS = [
  { value: 'licht', label: 'Licht' },
  { value: 'medium', label: 'Medium' },
  { value: 'vol', label: 'Vol' },
];

const TYPE_COLORS: Record<string, string> = {
  rood: 'red', wit: 'yellow', rosé: 'pink', oranje: 'orange', mousserende: 'cyan', zoet: 'grape',
};

const emptyForm = {
  name: '',
  producer: '',
  vintage: '' as number | '',
  country: '',
  region: '',
  grape_varieties: [] as string[],
  wine_type: '',
  tasting_note: '',
  description: '',
  body: '',
  alcohol_percentage: '' as number | '',
  food_pairing: '',
  show_on_homepage: false,
  image: null as string | null,
};

type WineForm = typeof emptyForm;

function WineFormFields({ form, setForm }: {
  form: WineForm;
  setForm: React.Dispatch<React.SetStateAction<WineForm>>;
}) {
  const set = (key: keyof WineForm) => (val: any) =>
    setForm(f => ({ ...f, [key]: val }));

  return (
    <Stack gap="sm">
      <Group grow>
        <TextInput label="Naam" withAsterisk value={form.name} onChange={e => set('name')(e.currentTarget.value)} />
        <TextInput label="Producent" withAsterisk value={form.producer} onChange={e => set('producer')(e.currentTarget.value)} />
      </Group>
      <Group grow>
        <Select label="Type" withAsterisk data={WINE_TYPES} value={form.wine_type} onChange={set('wine_type')} />
        <NumberInput label="Jaargang" placeholder="bijv. 2019" min={1800} max={new Date().getFullYear()} value={form.vintage} onChange={set('vintage')} />
      </Group>
      <Group grow>
        <TextInput label="Land" withAsterisk value={form.country} onChange={e => set('country')(e.currentTarget.value)} />
        <TextInput label="Regio" value={form.region} onChange={e => set('region')(e.currentTarget.value)} />
      </Group>
      <TagsInput
        label="Druivenrassen"
        placeholder="Typ en druk Enter"
        value={form.grape_varieties}
        onChange={set('grape_varieties')}
      />
      <Group grow>
        <Select label="Body" data={BODY_OPTIONS} value={form.body} onChange={set('body')} clearable />
        <NumberInput label="Alcohol %" placeholder="bijv. 13.5" min={0} max={25} decimalScale={1} value={form.alcohol_percentage} onChange={set('alcohol_percentage')} />
      </Group>
      <Textarea label="Smaaknotitie" placeholder="Beschrijf de smaak..." value={form.tasting_note} onChange={e => set('tasting_note')(e.currentTarget.value)} autosize minRows={2} />
      <Textarea label="Wijnspijsadvies" placeholder="Bijv. gegrild vlees, kaas..." value={form.food_pairing} onChange={e => set('food_pairing')(e.currentTarget.value)} autosize minRows={2} />
      <Textarea label="Extra informatie" placeholder="Geschiedenis, achtergrondverhaal, bijzonderheden..." value={form.description} onChange={e => set('description')(e.currentTarget.value)} autosize minRows={3} />
      <Switch
        label="Toon op homepagina"
        color="brand"
        checked={form.show_on_homepage}
        onChange={e => {
          const checked = e.currentTarget.checked;
          setForm(f => ({ ...f, show_on_homepage: checked, image: checked ? f.image : null }));
        }}
      />
      {form.show_on_homepage && <div>
        <Text size="sm" fw={500} mb={6}>Foto</Text>
        {form.image ? (
          <Stack gap="xs">
            <Image src={form.image} radius="md" mah={200} fit="contain" />
            <Button
              variant="subtle"
              color="red"
              size="xs"
              leftSection={<IconX size={14} />}
              onClick={() => set('image')(null)}
            >
              Foto verwijderen
            </Button>
          </Stack>
        ) : (
          <FileButton
            onChange={file => {
              if (!file) return;
              if (file.size > 15 * 1024 * 1024) {
                notifications.show({ message: 'Foto mag maximaal 15 MB zijn.', color: 'red' });
                return;
              }
              const reader = new FileReader();
              reader.onload = e => set('image')(e.target?.result as string);
              reader.readAsDataURL(file);
            }}
            accept="image/*"
          >
            {props => (
              <Button variant="light" color="brand" size="xs" leftSection={<IconUpload size={14} />} {...props}>
                Foto uploaden
              </Button>
            )}
          </FileButton>
        )}
      </div>}
    </Stack>
  );
}

export default function WineLibrary() {
  const [wines, setWines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add modal state
  const [addActivityId, setAddActivityId] = useState<number | null>(null);
  const [addActivityName, setAddActivityName] = useState('');
  const [addForm, setAddForm] = useState<WineForm>(emptyForm);
  const [adding, setAdding] = useState(false);

  // Edit modal state
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<WineForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getAllWinesAdmin()
      .then(setWines)
      .catch(() => notifications.show({ message: 'Laden mislukt.', color: 'red' }))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Groepeer per activiteit, gesorteerd op datum (nieuwste eerst)
  const byActivity = useMemo(() => {
    const q = search.toLowerCase();
    const grouped: Record<number, { name: string; date: string; items: any[] }> = {};

    for (const w of wines) {
      const matchesSearch =
        !q ||
        w.name?.toLowerCase().includes(q) ||
        w.producer?.toLowerCase().includes(q) ||
        w.activity_name?.toLowerCase().includes(q);

      if (!matchesSearch) continue;

      const id = w.activity_id;
      if (!grouped[id]) {
        grouped[id] = { name: w.activity_name ?? `Activiteit ${id}`, date: w.activity_date ?? '', items: [] };
      }
      grouped[id].items.push(w);
    }

    return Object.entries(grouped).sort(([, a], [, b]) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [wines, search]);

  const handleAdd = async () => {
    if (!addForm.name || !addForm.producer || !addForm.country || !addForm.wine_type) {
      notifications.show({ message: 'Naam, producent, land en type zijn verplicht.', color: 'red' });
      return;
    }
    setAdding(true);
    try {
      await createWine({
        activity_id: addActivityId,
        name: addForm.name,
        producer: addForm.producer,
        vintage: addForm.vintage || null,
        country: addForm.country,
        region: addForm.region || null,
        grape_varieties: addForm.grape_varieties,
        wine_type: addForm.wine_type,
        tasting_note: addForm.tasting_note || null,
        description: addForm.description || null,
        body: addForm.body || null,
        alcohol_percentage: addForm.alcohol_percentage || null,
        food_pairing: addForm.food_pairing || null,
        show_on_homepage: addForm.show_on_homepage,
        image: addForm.image || null,
      });
      notifications.show({ message: 'Wijn toegevoegd!', color: 'green' });
      setAddActivityId(null);
      setAddForm(emptyForm);
      load();
    } catch {
      notifications.show({ message: 'Fout bij toevoegen.', color: 'red' });
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      await updateWine(editTarget.id, {
        name: editForm.name,
        producer: editForm.producer,
        vintage: editForm.vintage || null,
        country: editForm.country,
        region: editForm.region || null,
        grape_varieties: editForm.grape_varieties,
        wine_type: editForm.wine_type,
        tasting_note: editForm.tasting_note || null,
        description: editForm.description || null,
        body: editForm.body || null,
        alcohol_percentage: editForm.alcohol_percentage || null,
        food_pairing: editForm.food_pairing || null,
        show_on_homepage: editForm.show_on_homepage,
        image: editForm.image || null,
      });
      notifications.show({ message: 'Wijn bijgewerkt!', color: 'green' });
      setEditTarget(null);
      load();
    } catch {
      notifications.show({ message: 'Fout bij opslaan.', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteWine(id);
      notifications.show({ message: 'Wijn verwijderd.', color: 'orange' });
      load();
    } catch {
      notifications.show({ message: 'Fout bij verwijderen.', color: 'red' });
    }
  };

  const handleToggleHidden = async (w: any) => {
    try {
      await updateWine(w.id, { hidden: !w.hidden });
      load();
    } catch {
      notifications.show({ message: 'Fout bij bijwerken.', color: 'red' });
    }
  };

  const handleToggleHomepage = async (w: any) => {
    try {
      await updateWine(w.id, { show_on_homepage: !w.show_on_homepage });
      load();
    } catch {
      notifications.show({ message: 'Fout bij bijwerken.', color: 'red' });
    }
  };

  const handleQuickPhotoUpload = (w: any, file: File | null) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      notifications.show({ message: 'Foto mag maximaal 15 MB zijn.', color: 'red' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        await updateWine(w.id, { image: e.target?.result as string });
        notifications.show({ message: 'Foto opgeslagen!', color: 'green' });
        load();
      } catch {
        notifications.show({ message: 'Fout bij uploaden.', color: 'red' });
      }
    };
    reader.readAsDataURL(file);
  };

  const openEdit = (w: any) => {
    setEditTarget(w);
    setEditForm({
      name: w.name ?? '',
      producer: w.producer ?? '',
      vintage: w.vintage ?? '',
      country: w.country ?? '',
      region: w.region ?? '',
      grape_varieties: w.grape_varieties ?? [],
      wine_type: w.wine_type ?? '',
      tasting_note: w.tasting_note ?? '',
      description: w.description ?? '',
      body: w.body ?? '',
      alcohol_percentage: w.alcohol_percentage ?? '',
      food_pairing: w.food_pairing ?? '',
      show_on_homepage: w.show_on_homepage ?? false,
      image: w.image ?? null,
    });
  };

  const openAdd = (activityId: number, activityName: string) => {
    setAddActivityId(activityId);
    setAddActivityName(activityName);
    setAddForm(emptyForm);
  };

  if (loading) return <Center h="40vh"><Loader color="brand" type="dots" size="lg" /></Center>;

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-end">
        <Title order={2}>Wijnbibliotheek</Title>
        <Text c="dimmed" size="sm">{wines.length} wijnen in totaal</Text>
      </Group>

      <TextInput
        placeholder="Zoek op wijn, producent of activiteit..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={e => setSearch(e.currentTarget.value)}
        style={{ maxWidth: 400 }}
      />

      {byActivity.length === 0 && (
        <Text c="dimmed">
          {search ? 'Geen wijnen gevonden voor deze zoekopdracht.' : 'Nog geen wijnen toegevoegd.'}
        </Text>
      )}

      <Accordion variant="separated" chevronPosition="right">
        {byActivity.map(([actId, act]) => (
          <Accordion.Item key={actId} value={String(actId)}>
            <Accordion.Control>
              <Group justify="space-between" pr="md">
                <div>
                  <Text fw={600}>{act.name}</Text>
                  <Text size="xs" c="dimmed">
                    {act.date ? dayjs(act.date).format('dddd D MMMM YYYY') : 'Geen datum'}
                  </Text>
                </div>
                <Badge color="brand" variant="light">{act.items.length} {act.items.length === 1 ? 'wijn' : 'wijnen'}</Badge>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                {/* Desktop tabel */}
                <Table.ScrollContainer minWidth={600} visibleFrom="sm">
                  <Table striped withTableBorder withColumnBorders>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Naam</Table.Th>
                        <Table.Th>Type</Table.Th>
                        <Table.Th>Producent</Table.Th>
                        <Table.Th>Jaargang</Table.Th>
                        <Table.Th>Body</Table.Th>
                        <Table.Th></Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {act.items.map((w: any) => (
                        <Table.Tr key={w.id}>
                          <Table.Td>
                            <Group gap="xs">
                              <Text size="sm" fw={500}>{w.name}</Text>
                              {w.hidden && <Badge color="gray" variant="outline" size="xs">Verborgen</Badge>}
                              {w.show_on_homepage && <Badge color="brand" variant="light" size="xs">Homepage</Badge>}
                            </Group>
                            {w.grape_varieties?.length > 0 && (
                              <Text size="xs" c="dimmed">{w.grape_varieties.join(', ')}</Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Badge color={TYPE_COLORS[w.wine_type] ?? 'gray'} variant="light" size="sm">
                              {w.wine_type}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{w.producer}</Text>
                            {w.region && <Text size="xs" c="dimmed">{w.region}{w.country ? `, ${w.country}` : ''}</Text>}
                            {!w.region && w.country && <Text size="xs" c="dimmed">{w.country}</Text>}
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{w.vintage ?? '—'}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{w.body ?? '—'}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs" justify="flex-end">
                              <Tooltip label={w.show_on_homepage ? 'Verwijder van homepagina' : 'Toon op homepagina'}>
                                <ActionIcon variant="light" color={w.show_on_homepage ? 'brand' : 'gray'} size="sm" onClick={() => handleToggleHomepage(w)}>
                                  <IconHome size={14} />
                                </ActionIcon>
                              </Tooltip>
                              {w.show_on_homepage && (
                                <Tooltip label={w.image ? 'Foto wijzigen' : 'Foto uploaden'}>
                                  <FileButton onChange={file => handleQuickPhotoUpload(w, file)} accept="image/*">
                                    {props => (
                                      <ActionIcon variant="light" color={w.image ? 'green' : 'gray'} size="sm" {...props}>
                                        <IconPhoto size={14} />
                                      </ActionIcon>
                                    )}
                                  </FileButton>
                                </Tooltip>
                              )}
                              <Tooltip label={w.hidden ? 'Zichtbaar maken' : 'Verbergen'}>
                                <ActionIcon variant="light" color={w.hidden ? 'gray' : 'teal'} size="sm" onClick={() => handleToggleHidden(w)}>
                                  {w.hidden ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                                </ActionIcon>
                              </Tooltip>
                              <ActionIcon variant="light" color="brand" size="sm" onClick={() => openEdit(w)}>
                                <IconEdit size={14} />
                              </ActionIcon>
                              <ActionIcon variant="light" color="red" size="sm" onClick={() => handleDelete(w.id)}>
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>

                {/* Mobiele kaartweergave */}
                <Stack gap="xs" hiddenFrom="sm">
                  {act.items.map((w: any) => (
                    <div key={w.id} style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8, padding: '10px 12px' }}>
                      <Group justify="space-between" align="flex-start" wrap="nowrap">
                        <div style={{ minWidth: 0 }}>
                          <Group gap="xs" wrap="wrap">
                            <Text size="sm" fw={600} style={{ wordBreak: 'break-word' }}>{w.name}</Text>
                            <Badge color={TYPE_COLORS[w.wine_type] ?? 'gray'} variant="light" size="xs">{w.wine_type}</Badge>
                            {w.hidden && <Badge color="gray" variant="outline" size="xs">Verborgen</Badge>}
                            {w.show_on_homepage && <Badge color="brand" variant="light" size="xs">Homepage</Badge>}
                          </Group>
                          <Text size="xs" c="dimmed" mt={2}>
                            {w.producer}
                            {w.vintage ? ` · ${w.vintage}` : ''}
                            {w.region ? ` · ${w.region}` : ''}
                            {w.country ? `, ${w.country}` : ''}
                          </Text>
                          {w.body && <Text size="xs" c="dimmed">{w.body}</Text>}
                        </div>
                        <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
                          <ActionIcon variant="light" color={w.show_on_homepage ? 'brand' : 'gray'} size="sm" onClick={() => handleToggleHomepage(w)}>
                            <IconHome size={14} />
                          </ActionIcon>
                          {w.show_on_homepage && (
                            <FileButton onChange={file => handleQuickPhotoUpload(w, file)} accept="image/*">
                              {props => (
                                <ActionIcon variant="light" color={w.image ? 'green' : 'gray'} size="sm" {...props}>
                                  <IconPhoto size={14} />
                                </ActionIcon>
                              )}
                            </FileButton>
                          )}
                          <ActionIcon variant="light" color={w.hidden ? 'gray' : 'teal'} size="sm" onClick={() => handleToggleHidden(w)}>
                            {w.hidden ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                          </ActionIcon>
                          <ActionIcon variant="light" color="brand" size="sm" onClick={() => openEdit(w)}>
                            <IconEdit size={14} />
                          </ActionIcon>
                          <ActionIcon variant="light" color="red" size="sm" onClick={() => handleDelete(w.id)}>
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    </div>
                  ))}
                </Stack>

                <Divider />
                <Button
                  leftSection={<IconPlus size={16} />}
                  color="brand"
                  variant="light"
                  size="sm"
                  onClick={() => openAdd(Number(actId), act.name)}
                >
                  Wijn toevoegen
                </Button>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>

      {/* Wijn toevoegen modal */}
      <Modal
        opened={addActivityId !== null}
        onClose={() => { setAddActivityId(null); setAddForm(emptyForm); }}
        title={`Wijn toevoegen — ${addActivityName}`}
        size="lg"
      >
        <WineFormFields form={addForm} setForm={setAddForm} />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setAddActivityId(null)}>Annuleren</Button>
          <Button color="brand" loading={adding} onClick={handleAdd}>Toevoegen</Button>
        </Group>
      </Modal>

      {/* Wijn bewerken modal */}
      <Modal
        opened={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Wijn bewerken"
        size="lg"
      >
        <WineFormFields form={editForm} setForm={setEditForm} />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setEditTarget(null)}>Annuleren</Button>
          <Button color="brand" loading={saving} onClick={handleEdit}>Opslaan</Button>
        </Group>
      </Modal>
    </Stack>
  );
}
