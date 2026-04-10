import { useEffect, useState } from 'react';
import {
  Container, Title, Text, Stack, Paper, Group, Badge, Divider,
  Textarea, Button, Rating, Loader, Center, Accordion, TextInput,
  Chip, ActionIcon, Tooltip, Select, SimpleGrid, Collapse, Pagination,
  Tabs,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSearch, IconX, IconFilter, IconChevronDown } from '@tabler/icons-react';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { getMyLibrary, getAllLibrary, updatePersonalNote } from '../api/wines';
import { usePagination } from '../hooks/usePagination';
import dayjs from 'dayjs';
import 'dayjs/locale/nl';

dayjs.locale('nl');

const TYPE_COLORS: Record<string, string> = {
  rood: 'red', wit: 'yellow', rosé: 'pink', oranje: 'orange', mousserende: 'cyan', zoet: 'grape',
};

const WINE_TYPES = ['rood', 'wit', 'rosé', 'oranje', 'mousserende', 'zoet'];

function WineCard({ wine, editable, onSave }: { wine: any; editable: boolean; onSave: () => void }) {
  const [open, { toggle }] = useDisclosure(false);
  const [note, setNote] = useState(wine.personal_note ?? '');
  const [rating, setRating] = useState(wine.rating ?? 0);
  const [saving, setSaving] = useState(false);
  const changed = note !== (wine.personal_note ?? '') || rating !== (wine.rating ?? 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePersonalNote(wine.id, {
        personal_note: note || undefined,
        rating: rating || undefined,
      });
      notifications.show({ message: 'Opgeslagen!', color: 'green' });
      onSave();
    } catch {
      notifications.show({ message: 'Opslaan mislukt.', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper withBorder radius="md" p="md">
      {/* Header — altijd zichtbaar */}
      <Group justify="space-between" align="center" style={{ cursor: 'pointer' }} onClick={toggle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" mb={2}>
            <Text fw={700} size="md">{wine.name}</Text>
            {wine.vintage && <Text size="sm" c="dimmed">{wine.vintage}</Text>}
            <Badge color={TYPE_COLORS[wine.wine_type] ?? 'gray'} variant="light" size="sm">
              {wine.wine_type}
            </Badge>
            {wine.personal_note && !open && (
              <Badge color="brand" variant="dot" size="sm">Notitie</Badge>
            )}
          </Group>
          <Text size="sm" c="dimmed" truncate>
            {wine.producer}{wine.region ? ` · ${wine.region}` : ''}{wine.country ? `, ${wine.country}` : ''}
          </Text>
        </div>
        <Group gap="sm" wrap="nowrap">
          {editable && <Rating value={rating} size="sm" readOnly fractions={2} />}
          <IconChevronDown
            size={18}
            color="var(--mantine-color-dimmed)"
            style={{ transition: 'transform 200ms', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
          />
        </Group>
      </Group>

      {/* Uitvouwbaar deel */}
      <Collapse in={open}>
        <Stack gap="xs" mt="sm">
          {wine.grape_varieties?.length > 0 && (
            <Text size="xs" c="dimmed">{wine.grape_varieties.join(', ')}</Text>
          )}
          {wine.body && (
            <Group gap="xs">
              <Text size="xs" fw={600} tt="uppercase" c="dimmed">Body</Text>
              <Text size="xs">{wine.body}</Text>
            </Group>
          )}
          {wine.alcohol_percentage && (
            <Group gap="xs">
              <Text size="xs" fw={600} tt="uppercase" c="dimmed">Alcohol</Text>
              <Text size="xs">{wine.alcohol_percentage}%</Text>
            </Group>
          )}
          {wine.tasting_note && (
            <div>
              <Text size="xs" fw={600} tt="uppercase" c="dimmed">Smaaknotitie</Text>
              <Text size="sm" mt={2}>{wine.tasting_note}</Text>
            </div>
          )}
          {wine.food_pairing && (
            <div>
              <Text size="xs" fw={600} tt="uppercase" c="dimmed">Wijnspijsadvies</Text>
              <Text size="sm" mt={2}>{wine.food_pairing}</Text>
            </div>
          )}
          {wine.description && (
            <div>
              <Text size="xs" fw={600} tt="uppercase" c="dimmed">Extra informatie</Text>
              <Text size="sm" mt={2} style={{ whiteSpace: 'pre-wrap' }}>{wine.description}</Text>
            </div>
          )}
        </Stack>

        {editable && (
          <>
            <Divider my="sm" />
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Text size="xs" fw={600} tt="uppercase" c="dimmed">Mijn notitie</Text>
                <Rating value={rating} onChange={setRating} size="md" fractions={2} />
              </Group>
              <Textarea
                placeholder="Voeg je persoonlijke smaaknotitie toe..."
                value={note}
                onChange={e => setNote(e.currentTarget.value)}
                autosize
                minRows={2}
              />
              {changed && (
                <Button size="xs" color="brand" loading={saving} onClick={handleSave} w="fit-content">
                  Opslaan
                </Button>
              )}
            </Stack>
          </>
        )}
      </Collapse>
    </Paper>
  );
}

function WineList({ wines, loading, tab, onSave }: {
  wines: any[];
  loading: boolean;
  tab: 'mine' | 'all';
  onSave: () => void;
}) {
  const [filtersOpen, { toggle: toggleFilters }] = useDisclosure(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [vintageFilter, setVintageFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [minRating, setMinRating] = useState(0);

  const countries = [...new Set(wines.map(w => w.country).filter(Boolean))].sort();
  const vintages = [...new Set(wines.map(w => w.vintage).filter(Boolean))].sort((a, b) => b - a).map(String);

  const hasFilters = search.trim() !== '' || typeFilter.length > 0 || countryFilter !== null || vintageFilter !== null || dateRange[0] !== null || minRating > 0;

  const clearFilters = () => {
    setSearch('');
    setTypeFilter([]);
    setCountryFilter(null);
    setVintageFilter(null);
    setDateRange([null, null]);
    setMinRating(0);
  };

  const filtered = wines.filter(w => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!w.name.toLowerCase().includes(q) && !w.producer.toLowerCase().includes(q)) return false;
    }
    if (typeFilter.length > 0 && !typeFilter.includes(w.wine_type)) return false;
    if (countryFilter && w.country !== countryFilter) return false;
    if (vintageFilter && String(w.vintage) !== vintageFilter) return false;
    if (dateRange[0]) {
      const actDate = new Date(w.activity_date);
      if (actDate < dateRange[0]) return false;
      if (dateRange[1] && actDate > dateRange[1]) return false;
    }
    if (minRating > 0 && (w.rating ?? 0) < minRating) return false;
    return true;
  });

  // Groepeer per activiteit
  const byActivity = filtered.reduce<Record<string, { name: string; date: string; wines: any[] }>>((acc, w) => {
    const key = `${w.activity_id}`;
    if (!acc[key]) acc[key] = { name: w.activity_name, date: w.activity_date, wines: [] };
    acc[key].wines.push(w);
    return acc;
  }, {});

  const groups = Object.entries(byActivity).sort(([, a], [, b]) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const { page, setPage, totalPages, paginated: paginatedGroups } = usePagination(
    groups,
    [search, typeFilter.join(), countryFilter, vintageFilter, dateRange[0]?.toString(), minRating]
  );

  if (loading) return <Center h="60vh"><Loader color="brand" type="dots" size="lg" /></Center>;

  return (
    <>
      {wines.length > 0 && (
        <Paper withBorder radius="md" p="md" mb="xl">
          <Group justify="space-between">
            <Button
              variant="subtle"
              color="brand"
              leftSection={<IconFilter size={16} />}
              rightSection={hasFilters ? <Badge color="brand" size="xs" circle>{[search.trim(), ...typeFilter, countryFilter, vintageFilter, dateRange[0], minRating || null].filter(Boolean).length}</Badge> : null}
              onClick={toggleFilters}
            >
              Filters {filtersOpen ? 'verbergen' : 'tonen'}
            </Button>
            {hasFilters && !filtersOpen && (
              <Button variant="subtle" color="gray" size="xs" onClick={clearFilters}>
                Wissen
              </Button>
            )}
          </Group>

          <Collapse in={filtersOpen}>
            <Stack gap="sm" mt="sm">
              <TextInput
                placeholder="Zoek op naam of producent..."
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={e => setSearch(e.currentTarget.value)}
                rightSection={search ? (
                  <ActionIcon variant="subtle" color="gray" onClick={() => setSearch('')}>
                    <IconX size={14} />
                  </ActionIcon>
                ) : null}
              />
              <Group gap="xs" align="center">
                <Text size="xs" fw={600} tt="uppercase" c="dimmed" style={{ whiteSpace: 'nowrap' }}>Type</Text>
                <Chip.Group multiple value={typeFilter} onChange={setTypeFilter}>
                  <Group gap="xs">
                    {WINE_TYPES.map(t => (
                      <Chip key={t} value={t} size="xs" color={TYPE_COLORS[t] ?? 'gray'}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Chip>
                    ))}
                  </Group>
                </Chip.Group>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <Select
                  placeholder="Alle landen"
                  label="Land"
                  data={countries}
                  value={countryFilter}
                  onChange={setCountryFilter}
                  clearable
                  searchable
                />
                <Select
                  placeholder="Alle jaargangen"
                  label="Jaargang"
                  data={vintages}
                  value={vintageFilter}
                  onChange={setVintageFilter}
                  clearable
                />
              </SimpleGrid>
              <Group grow align="flex-end">
                <DateInput
                  label="Datum geproefd van"
                  placeholder="DD-MM-JJJJ"
                  valueFormat="DD-MM-YYYY"
                  locale="nl"
                  value={dateRange[0]}
                  onChange={v => setDateRange([v, dateRange[1]])}
                  clearable
                  maxDate={dateRange[1] ?? undefined}
                />
                <DateInput
                  label="Tot"
                  placeholder="DD-MM-JJJJ"
                  valueFormat="DD-MM-YYYY"
                  locale="nl"
                  value={dateRange[1]}
                  onChange={v => setDateRange([dateRange[0], v])}
                  clearable
                  minDate={dateRange[0] ?? undefined}
                />
              </Group>
              {tab === 'mine' && (
                <Group gap="xs" align="center">
                  <Text size="xs" fw={600} tt="uppercase" c="dimmed" style={{ whiteSpace: 'nowrap' }}>Min. beoordeling</Text>
                  <Rating value={minRating} onChange={setMinRating} fractions={2} />
                  {minRating > 0 && (
                    <Tooltip label="Wis beoordeling">
                      <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => setMinRating(0)}>
                        <IconX size={12} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              )}
              {hasFilters && (
                <Button variant="subtle" color="gray" size="xs" w="fit-content" onClick={clearFilters}>
                  Filters wissen
                </Button>
              )}
            </Stack>
          </Collapse>
        </Paper>
      )}

      {wines.length === 0 && tab === 'mine' && (
        <Text c="dimmed">Je hebt nog geen wijnen in je bibliotheek. Meld je aan voor een activiteit!</Text>
      )}
      {wines.length === 0 && tab === 'all' && (
        <Text c="dimmed">Er zijn nog geen wijnen toegevoegd.</Text>
      )}

      {wines.length > 0 && groups.length === 0 && (
        <Text c="dimmed">Geen wijnen gevonden met de huidige filters.</Text>
      )}

      <Accordion variant="separated" chevronPosition="right">
        {paginatedGroups.map(([key, group]) => (
          <Accordion.Item key={key} value={key}>
            <Accordion.Control>
              <div>
                <Text fw={600}>{group.name}</Text>
                <Text size="xs" c="dimmed">
                  {dayjs(group.date).format('dddd D MMMM YYYY')} · {group.wines.length} wijn{group.wines.length !== 1 ? 'en' : ''}
                </Text>
              </div>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                {group.wines.map(w => (
                  <WineCard
                    key={w.id}
                    wine={w}
                    editable={tab === 'mine' || w.attended === true}
                    onSave={onSave}
                  />
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>

      {totalPages > 1 && (
        <Group justify="center" mt="xl">
          <Pagination value={page} onChange={setPage} total={totalPages} color="brand" />
        </Group>
      )}
    </>
  );
}

export default function Library() {
  const [tab, setTab] = useState<string>('mine');
  const [myWines, setMyWines] = useState<any[]>([]);
  const [allWines, setAllWines] = useState<any[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [loadingAll, setLoadingAll] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);

  const loadMine = () => {
    getMyLibrary()
      .then(setMyWines)
      .catch(() => notifications.show({ message: 'Laden mislukt.', color: 'red' }))
      .finally(() => setLoadingMine(false));
  };

  const loadAll = () => {
    setLoadingAll(true);
    getAllLibrary()
      .then(data => { setAllWines(data); setAllLoaded(true); })
      .catch(() => notifications.show({ message: 'Laden mislukt.', color: 'red' }))
      .finally(() => setLoadingAll(false));
  };

  useEffect(loadMine, []);

  const handleTabChange = (value: string | null) => {
    if (!value) return;
    setTab(value);
    if (value === 'all' && !allLoaded) loadAll();
  };

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="xs">Wijnbibliotheek</Title>

      <Tabs value={tab} onChange={handleTabChange} mb="xl">
        <Tabs.List mb="lg">
          <Tabs.Tab value="mine">Mijn wijnen</Tabs.Tab>
          <Tabs.Tab value="all">Alle wijnen</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="mine">
          <Text c="dimmed" mb="lg">Wijnen uit lessen waarbij jij aanwezig was.</Text>
          <WineList wines={myWines} loading={loadingMine} tab="mine" onSave={loadMine} />
        </Tabs.Panel>

        <Tabs.Panel value="all">
          <Text c="dimmed" mb="lg">Alle wijnen die gedronken zijn in alle lessen.</Text>
          <WineList wines={allWines} loading={loadingAll} tab="all" onSave={loadAll} />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
