import { useEffect, useState } from 'react';
import {
  Modal, Stack, TextInput, Textarea, NumberInput, Select, Group, Button,
  Text, Badge, ActionIcon, Divider, Loader, Center, TagsInput, Tooltip, Switch,
} from '@mantine/core';
import { IconEdit, IconTrash, IconPlus, IconEye, IconEyeOff, IconHome } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getWinesForActivity, createWine, updateWine, deleteWine } from '../../api/wines';

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

const emptyWineForm = {
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
};

type WineForm = typeof emptyWineForm;

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
        onChange={e => set('show_on_homepage')(e.currentTarget.checked)}
      />
    </Stack>
  );
}

export default function WinesModal({ activityId, activityName, opened, onClose }: {
  activityId: number;
  activityName: string;
  opened: boolean;
  onClose: () => void;
}) {
  const [wines, setWines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<WineForm>(emptyWineForm);
  const [adding, setAdding] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<WineForm>(emptyWineForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getWinesForActivity(activityId)
      .then(setWines)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (opened) load();
  }, [opened, activityId]);

  const handleAdd = async () => {
    if (!addForm.name || !addForm.producer || !addForm.country || !addForm.wine_type) {
      notifications.show({ message: 'Naam, producent, land en type zijn verplicht.', color: 'red' });
      return;
    }
    setAdding(true);
    try {
      await createWine({
        activity_id: activityId,
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
      });
      notifications.show({ message: 'Wijn toegevoegd!', color: 'green' });
      setAddOpen(false);
      setAddForm(emptyWineForm);
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
    });
  };

  return (
    <>
      <Modal opened={opened} onClose={onClose} title={`Wijnen — ${activityName}`} size="lg">
        {loading ? (
          <Center py="xl"><Loader color="brand" type="dots" /></Center>
        ) : (
          <Stack gap="md">
            {wines.length === 0 && (
              <Text c="dimmed" size="sm">Nog geen wijnen toegevoegd aan deze activiteit.</Text>
            )}
            {wines.map((w, i) => (
              <div key={w.id}>
                {i > 0 && <Divider />}
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Group gap="xs" mb={2}>
                      <Text fw={600}>{w.name}</Text>
                      {w.vintage && <Text size="sm" c="dimmed">{w.vintage}</Text>}
                      <Badge color={TYPE_COLORS[w.wine_type] ?? 'gray'} variant="light" size="sm">{w.wine_type}</Badge>
                      {w.hidden && <Badge color="gray" variant="outline" size="sm">Verborgen</Badge>}
                      {w.show_on_homepage && <Badge color="brand" variant="light" size="sm">Homepage</Badge>}
                    </Group>
                    <Text size="sm" c="dimmed">{w.producer}{w.region ? ` · ${w.region}` : ''}{w.country ? `, ${w.country}` : ''}</Text>
                    {w.grape_varieties?.length > 0 && (
                      <Text size="xs" c="dimmed">{w.grape_varieties.join(', ')}</Text>
                    )}
                  </div>
                  <Group gap="xs">
                    <Tooltip label={w.show_on_homepage ? 'Verwijder van homepagina' : 'Toon op homepagina'}>
                      <ActionIcon variant="light" color={w.show_on_homepage ? 'brand' : 'gray'} onClick={() => handleToggleHomepage(w)}>
                        <IconHome size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={w.hidden ? 'Zichtbaar maken' : 'Verbergen'}>
                      <ActionIcon variant="light" color={w.hidden ? 'gray' : 'teal'} onClick={() => handleToggleHidden(w)}>
                        {w.hidden ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                      </ActionIcon>
                    </Tooltip>
                    <ActionIcon variant="light" color="brand" onClick={() => openEdit(w)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="light" color="red" onClick={() => handleDelete(w.id)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </div>
            ))}
            <Button
              leftSection={<IconPlus size={16} />}
              color="brand"
              variant="light"
              onClick={() => setAddOpen(true)}
            >
              Wijn toevoegen
            </Button>
          </Stack>
        )}
      </Modal>

      <Modal opened={addOpen} onClose={() => { setAddOpen(false); setAddForm(emptyWineForm); }} title="Wijn toevoegen" size="lg">
        <WineFormFields form={addForm} setForm={setAddForm} />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setAddOpen(false)}>Annuleren</Button>
          <Button color="brand" loading={adding} onClick={handleAdd}>Toevoegen</Button>
        </Group>
      </Modal>

      <Modal opened={!!editTarget} onClose={() => setEditTarget(null)} title="Wijn bewerken" size="lg">
        <WineFormFields form={editForm} setForm={setEditForm} />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setEditTarget(null)}>Annuleren</Button>
          <Button color="brand" loading={saving} onClick={handleEdit}>Opslaan</Button>
        </Group>
      </Modal>
    </>
  );
}
