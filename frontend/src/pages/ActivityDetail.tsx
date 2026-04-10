import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Title, Text, Group, Badge, Button, Stack, Divider,
  Center, Loader, Avatar, Paper, SimpleGrid, ThemeIcon, ActionIcon,
  CopyButton, Tooltip, Code, Alert, TextInput, Rating, Textarea,
} from '@mantine/core';
import {
  IconCalendarEvent, IconMapPin, IconClock, IconUsers,
  IconCurrencyEuro, IconCheck, IconArrowLeft, IconUser,
  IconCopy, IconAlertCircle, IconCircleCheck, IconHourglass,
  IconUserPlus, IconTrash, IconX, IconGlassFull,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../context/AuthContext';
import {
  getActivity, getActivitySignups, getMySignups,
} from '../api/activities';
import { getPaymentInfo, confirmPayment } from '../api/payments';
import { getWinesForActivity, updatePersonalNote } from '../api/wines';
import WinesModal from './admin/Wines';
import dayjs from 'dayjs';
import 'dayjs/locale/nl';
import { formatTime } from '../utils/time';

dayjs.locale('nl');

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Group gap="sm" align="flex-start">
      <ThemeIcon size={32} radius="md" color="brand" variant="light" style={{ flexShrink: 0 }}>
        <Icon size={16} />
      </ThemeIcon>
      <div>
        <Text size="xs" c="dimmed" fw={600} tt="uppercase" lh={1.2}>{label}</Text>
        <Text size="sm" fw={500} mt={2}>{value}</Text>
      </div>
    </Group>
  );
}

function GuestNamesInput({
  guestNames, onAdd, onUpdate, onRemove,
}: {
  guestNames: string[];
  onAdd: () => void;
  onUpdate: (i: number, v: string) => void;
  onRemove?: (i: number) => void;
}) {
  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>Gasten meenemen?</Text>
      {guestNames.map((name, i) => (
        <Group key={i} gap="xs">
          <TextInput
            placeholder={`Naam gast ${i + 1}`}
            value={name}
            onChange={(e) => onUpdate(i, e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          {onRemove && (
            <ActionIcon variant="subtle" color="red" onClick={() => onRemove(i)}>
              <IconTrash size={16} />
            </ActionIcon>
          )}
        </Group>
      ))}
      <Button
        variant="subtle"
        color="brand"
        leftSection={<IconUserPlus size={16} />}
        onClick={onAdd}
        w="fit-content"
        size="sm"
      >
        Gast toevoegen
      </Button>
    </Stack>
  );
}

function PaymentField({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" align="center">
      <div>
        <Text size="xs" c="dimmed" fw={600} tt="uppercase">{label}</Text>
        <Code fz="sm" mt={2}>{value}</Code>
      </div>
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? 'Gekopieerd!' : 'Kopieer'}>
            <ActionIcon variant="subtle" color={copied ? 'green' : 'gray'} onClick={copy}>
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}

const WINE_TYPE_COLORS: Record<string, string> = {
  rood: 'red', wit: 'yellow', rosé: 'pink', oranje: 'orange', mousserende: 'cyan', zoet: 'grape',
};

function ActivityWineCard({ wine, canNote, isPrivileged, onSave }: {
  wine: any;
  canNote: boolean;
  isPrivileged: boolean;
  onSave: () => void;
}) {
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
      <Group justify="space-between" align="flex-start" mb="xs">
        <div>
          <Group gap="xs" mb={2}>
            <Text fw={700}>{wine.name}</Text>
            {wine.vintage && <Text size="sm" c="dimmed">{wine.vintage}</Text>}
            <Badge color={WINE_TYPE_COLORS[wine.wine_type] ?? 'gray'} variant="light" size="sm">
              {wine.wine_type}
            </Badge>
            {isPrivileged && wine.hidden && (
              <Badge color="gray" variant="outline" size="sm">Verborgen</Badge>
            )}
          </Group>
          <Text size="sm" c="dimmed">
            {wine.producer}{wine.region ? ` · ${wine.region}` : ''}{wine.country ? `, ${wine.country}` : ''}
          </Text>
          {wine.grape_varieties?.length > 0 && (
            <Text size="xs" c="dimmed" mt={2}>{wine.grape_varieties.join(', ')}</Text>
          )}
        </div>
        {canNote && <Rating value={rating} onChange={setRating} fractions={2} />}
      </Group>

      <Stack gap="xs">
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

      {canNote && (
        <>
          <Divider my="sm" />
          <Stack gap="xs">
            <Text size="xs" fw={600} tt="uppercase" c="dimmed">Mijn notitie</Text>
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
    </Paper>
  );
}

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoggedIn, isOrganizer, loading: authLoading } = useAuth();

  const [activity, setActivity] = useState<any | null>(null);
  const [signups, setSignups] = useState<any[]>([]);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [savedGuestNames, setSavedGuestNames] = useState<string[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [wines, setWines] = useState<any[]>([]);
  const [winesModalOpen, setWinesModalOpen] = useState(false);

  const actId = Number(id);
  const isActivityOrganizer = isOrganizer || (!!user && activity?.organizer_id === user.id);
  const hasCost = activity?.cost && activity.cost > 0;
  const GUEST_SURCHARGE = 5;
  const guestCostPerPerson = Number(activity?.cost ?? 0) + GUEST_SURCHARGE;
  const totalCost = Number(activity?.cost ?? 0) + guestNames.length * guestCostPerPerson;
  const guestsChanged = JSON.stringify(guestNames) !== JSON.stringify(savedGuestNames);

  useEffect(() => {
    if (authLoading) return;

    const fetches: Promise<any>[] = [
      getActivity(actId),
      isLoggedIn ? getMySignups() : Promise.resolve([]),
      isLoggedIn ? getActivitySignups(actId) : Promise.resolve([]),
      isLoggedIn ? getPaymentInfo(actId) : Promise.resolve(null),
      isLoggedIn ? getWinesForActivity(actId) : Promise.resolve([]),
    ];

    Promise.all(fetches)
      .then(([act, myIds, sups, pInfo, wineList]) => {
        setActivity(act);
        setIsSignedUp(myIds.includes(actId));
        setSignups(sups);
        setWines(wineList);
        if (pInfo) {
          setPaymentInfo(pInfo);
          setPaymentStatus(pInfo.status);
          const names = pInfo.guest_names ?? [];
          setGuestNames(names);
          setSavedGuestNames(names);
        }
      })
      .catch(() => navigate('/'))
      .finally(() => setPageLoading(false));
  }, [actId, isLoggedIn, authLoading, navigate]);

  const addGuest = () => setGuestNames(n => [...n, '']);
  const removeGuest = (i: number) => setGuestNames(n => n.filter((_, idx) => idx !== i));
  const updateGuest = (i: number, v: string) => setGuestNames(n => n.map((name, idx) => idx === i ? v : name));

  // Enkelvoudige handler voor zowel aanmelden als bijwerken
  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      await confirmPayment(actId, guestNames);
      const wasSignedUp = isSignedUp;
      setIsSignedUp(true);
      if (hasCost) setPaymentStatus('pending_verification');
      if (!wasSignedUp) {
        setActivity((a: any) => ({ ...a, signups_count: (a.signups_count ?? 0) + 1 + guestNames.length }));
      } else {
        // Herlaad signups om verschil in gasten te reflecteren
      }
      setSavedGuestNames([...guestNames]);
      getActivitySignups(actId).then(setSignups).catch(() => {});
      const msg = hasCost
        ? 'Betaling gemeld! Wacht op goedkeuring.'
        : wasSignedUp ? 'Gasten bijgewerkt!' : 'Je bent aangemeld!';
      notifications.show({ message: msg, color: 'green' });
    } catch (err: any) {
      notifications.show({ message: err.response?.data?.detail || 'Mislukt.', color: 'red' });
    } finally {
      setActionLoading(false);
    }
  };

  if (pageLoading) return <Center h="60vh"><Loader color="brand" type="dots" size="lg" /></Center>;
  if (!activity) return null;

  const isFull = activity.max_participants !== null && activity.max_participants !== undefined
    && (activity.signups_count ?? 0) >= activity.max_participants;

  const timeStr = activity.start_time
    ? formatTime(activity.start_time) + (activity.end_time ? ` – ${formatTime(activity.end_time)}` : '')
    : null;

  return (
    <Container size="md" py="xl">
      <ActionIcon variant="subtle" color="gray" mb="md" onClick={() => navigate(-1)}>
        <IconArrowLeft size={20} />
      </ActionIcon>

      {/* Header */}
      <Group justify="space-between" align="flex-start" mb="xs">
        <Title order={1} style={{ flex: 1 }}>{activity.name}</Title>
        <Group gap={6}>
          {isSignedUp && paymentStatus === 'paid' && <Badge color="green" size="lg">Betaald</Badge>}
          {isSignedUp && paymentStatus === 'pending_verification' && <Badge color="orange" size="lg">Betaling in behandeling</Badge>}
          {isSignedUp && paymentStatus === 'unpaid' && <Badge color="red" size="lg">Betaling afgewezen</Badge>}
          {isSignedUp && !hasCost && <Badge color="green" size="lg">Aangemeld</Badge>}
          {activity.is_public && <Badge color="teal" size="lg" variant="light">Publiek</Badge>}
          {isFull && !isSignedUp && <Badge color="red" size="lg" variant="light">Vol</Badge>}
        </Group>
      </Group>

      {activity.organizer_name && (
        <Text c="dimmed" size="sm" mb="xl">Georganiseerd door {activity.organizer_name}</Text>
      )}

      {/* Details */}
      <Paper withBorder radius="md" p="lg" mb="xl">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <InfoRow icon={IconCalendarEvent} label="Datum" value={dayjs(activity.date).format('dddd D MMMM YYYY')} />
          {timeStr && <InfoRow icon={IconClock} label="Tijd" value={timeStr} />}
          {activity.location && <InfoRow icon={IconMapPin} label="Locatie" value={activity.location} />}
          {activity.max_participants && (
            <InfoRow icon={IconUsers} label="Deelnemers" value={`${activity.signups_count ?? 0} / ${activity.max_participants}`} />
          )}
          {hasCost && (
            <InfoRow icon={IconCurrencyEuro} label="Kosten" value={`€ ${Number(activity.cost).toFixed(2)}`} />
          )}
        </SimpleGrid>
      </Paper>

      {/* Omschrijving */}
      {activity.description && (
        <>
          <Title order={3} mb="sm">Omschrijving</Title>
          <Text mb="xl" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{activity.description}</Text>
        </>
      )}

      <Divider mb="xl" />

      {/* Deelname sectie */}
      {isLoggedIn ? (
        <Paper withBorder radius="md" p="lg" mb="xl">
          <Title order={3} mb="md">Deelname</Title>

          <Stack gap="md">
            {/* Status alerts */}
            {isSignedUp && !hasCost && (
              <Alert icon={<IconCircleCheck size={16} />} color="green" variant="light">
                Je bent aangemeld voor deze activiteit.
              </Alert>
            )}
            {isSignedUp && hasCost && paymentStatus === 'paid' && (
              <Alert icon={<IconCircleCheck size={16} />} color="green" variant="light">
                Je bent aangemeld en je betaling is goedgekeurd.
              </Alert>
            )}
            {isSignedUp && hasCost && paymentStatus === 'pending_verification' && (
              <Alert icon={<IconHourglass size={16} />} color="orange" variant="light">
                Je betaling wordt gecontroleerd door een beheerder.
              </Alert>
            )}
            {isSignedUp && hasCost && paymentStatus === 'unpaid' && (
              <Alert icon={<IconX size={16} />} color="red" variant="light">
                Je betaling is afgewezen. Controleer het bedrag en meld je betaling opnieuw.
              </Alert>
            )}

            {/* Activiteit vol (en niet aangemeld) */}
            {!isSignedUp && isFull && (
              <Text size="sm" c="dimmed">Deze activiteit is helaas vol.</Text>
            )}

            {/* Gastenbeheer + aanmeld/betalingsformulier */}
            {(isSignedUp || !isFull) && (
              <>
                {!isSignedUp && !hasCost && (
                  <Text size="sm" c="dimmed">Meld je aan om deel te nemen aan deze activiteit.</Text>
                )}

                <GuestNamesInput
                  guestNames={guestNames}
                  onAdd={addGuest}
                  onUpdate={updateGuest}
                  onRemove={(!isSignedUp || paymentStatus === 'unpaid') ? removeGuest : undefined}
                />

                {/* Toelichting gastentarief */}
                {hasCost && guestNames.length > 0 && (
                  <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                    Gasten betalen het normale tarief + €{GUEST_SURCHARGE} toeslag (€ {guestCostPerPerson.toFixed(2)} p.p.).
                    Totaal voor {1 + guestNames.length} personen: <strong>€ {totalCost.toFixed(2)}</strong>.
                  </Alert>
                )}

                {/* Betaalgegevens: toon bij initieel aanmelden, bij afgewezen betaling, of als gasten zijn gewijzigd */}
                {hasCost && (!isSignedUp || paymentStatus === 'unpaid' || guestsChanged) && (
                  <>
                    <Text size="sm" c="dimmed">
                      Maak <strong>€ {totalCost.toFixed(2)}</strong> over naar onderstaand rekeningnummer en bevestig daarna je aanmelding.
                    </Text>
                    <Paper withBorder radius="md" p="md" bg="gray.0">
                      <Stack gap="sm">
                        <PaymentField label="Rekeningnummer" value={paymentInfo?.bank_account_number ?? '…'} />
                        <Divider />
                        <PaymentField label="Ten name van" value={paymentInfo?.bank_account_name ?? '…'} />
                        <Divider />
                        <PaymentField label="Omschrijving" value={paymentInfo?.reference ?? '…'} />
                        <Divider />
                        <Group justify="space-between" align="flex-start">
                          <div>
                            <Text size="xs" c="dimmed" fw={600} tt="uppercase">Bedrag</Text>
                            {guestNames.length > 0 && (
                              <Stack gap={2} mt={4}>
                                <Text size="xs" c="dimmed">Jij: € {Number(activity.cost).toFixed(2)}</Text>
                                {guestNames.map((n, i) => (
                                  <Text key={i} size="xs" c="dimmed">{n || `Gast ${i + 1}`}: € {guestCostPerPerson.toFixed(2)}</Text>
                                ))}
                              </Stack>
                            )}
                          </div>
                          {paymentStatus === 'paid' && guestsChanged ? (() => {
                            const alreadyPaid = Number(activity.cost) + savedGuestNames.length * guestCostPerPerson;
                            const extra = totalCost - alreadyPaid;
                            return (
                              <Stack gap={2} ta="right">
                                <Text size="xs" c="dimmed">Al betaald: € {alreadyPaid.toFixed(2)}</Text>
                                <Text fw={700} size="sm" c="brand">Nog te betalen: € {extra.toFixed(2)}</Text>
                              </Stack>
                            );
                          })() : (
                            <Text fw={700} size="sm">€ {totalCost.toFixed(2)}</Text>
                          )}
                        </Group>
                      </Stack>
                    </Paper>
                  </>
                )}

                {/* Actieknoppen */}
                {!isSignedUp && !hasCost && (
                  <Button color="brand" leftSection={<IconCheck size={16} />} loading={actionLoading} onClick={handleConfirm} w="fit-content">
                    Aanmelden{guestNames.length > 0 ? ` (${1 + guestNames.length} personen)` : ''}
                  </Button>
                )}
                {!isSignedUp && hasCost && (
                  <Button color="brand" leftSection={<IconCheck size={16} />} loading={actionLoading} onClick={handleConfirm} w="fit-content">
                    Betaling bevestigen en aanmelden
                  </Button>
                )}
                {isSignedUp && hasCost && (paymentStatus === 'unpaid' || guestsChanged) && (
                  <Button color="brand" leftSection={<IconCheck size={16} />} loading={actionLoading} onClick={handleConfirm} w="fit-content">
                    Betaling bevestigen
                  </Button>
                )}
                {isSignedUp && !hasCost && guestsChanged && (
                  <Button color="brand" leftSection={<IconCheck size={16} />} loading={actionLoading} onClick={handleConfirm} w="fit-content">
                    Gasten bijwerken
                  </Button>
                )}
              </>
            )}
          </Stack>
        </Paper>
      ) : (
        <Paper withBorder radius="md" p="lg" mb="xl" bg="gray.0">
          <Text size="sm" c="dimmed">
            <Button variant="subtle" color="brand" size="compact-sm" onClick={() => navigate('/login')}>Log in</Button>
            {' '}om je aan te melden voor deze activiteit.
          </Text>
        </Paper>
      )}

      {/* Deelnemerslijst */}
      {isLoggedIn && signups.length > 0 && (() => {
        const cards = signups.flatMap((s) => [
          { name: s.participant_name, isGuest: false },
          ...(s.guest_names ?? []).map((n: string) => ({ name: n || 'Gast', isGuest: true })),
        ]);
        return (
          <>
            <Title order={3} mb="md">
              Aangemeld ({cards.length}{activity.max_participants ? ` / ${activity.max_participants}` : ''})
            </Title>
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
              {cards.map((c, i) => (
                <Paper key={i} withBorder radius="md" p="sm">
                  <Group gap="sm">
                    <Avatar size={32} radius="xl" color={c.isGuest ? 'gray' : 'brand'}>
                      <IconUser size={16} />
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={500} truncate>{c.name}</Text>
                      {c.isGuest && <Text size="xs" c="dimmed">Gast</Text>}
                    </div>
                  </Group>
                </Paper>
              ))}
            </SimpleGrid>
          </>
        );
      })()}

      {/* Wijnen sectie */}
      {isLoggedIn && (isActivityOrganizer || wines.filter(w => !w.hidden).length > 0) && (
        <>
          <Divider my="xl" />
          <Group justify="space-between" align="center" mb="md">
            <Title order={3} mb={0}>Wijnen</Title>
            {isActivityOrganizer && (
              <Button
                leftSection={<IconGlassFull size={16} />}
                color="brand"
                variant="light"
                onClick={() => setWinesModalOpen(true)}
              >
                Wijnen beheren
              </Button>
            )}
          </Group>
          {wines.filter(w => isActivityOrganizer || !w.hidden).length === 0 ? (
            <Text c="dimmed" size="sm">Nog geen wijnen toegevoegd aan deze activiteit.</Text>
          ) : (
            <Stack gap="md">
              {wines
                .filter(w => isActivityOrganizer || !w.hidden)
                .map(w => (
                  <ActivityWineCard
                    key={w.id}
                    wine={w}
                    canNote={isSignedUp}
                    isPrivileged={isActivityOrganizer}
                    onSave={() => getWinesForActivity(actId).then(setWines).catch(() => {})}
                  />
                ))}
            </Stack>
          )}
          {isActivityOrganizer && (
            <WinesModal
              activityId={actId}
              activityName={activity.name}
              opened={winesModalOpen}
              onClose={() => {
                setWinesModalOpen(false);
                getWinesForActivity(actId).then(setWines).catch(() => {});
              }}
            />
          )}
        </>
      )}
    </Container>
  );
}
