import { useEffect, useState, useCallback } from 'react';
import bannerImg from '../assets/vineyard.webp';
import { useNavigate } from 'react-router-dom';
import {
  Container, Title, Text, SimpleGrid, Card, Group, Badge, Button,
  Stack, Center, Loader, Image, Modal, ActionIcon, Tooltip,
} from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import {
  IconCalendarEvent, IconMapPin, IconClock,
  IconUsers, IconLock, IconArrowRight, IconGlassFull, IconCamera,
  IconNews, IconChevronDown,
} from '@tabler/icons-react';

import { useAuth } from '../context/AuthContext';
import { getUpcomingActivities, getPublicActivities, getMySignups } from '../api/activities';
import { getHomepageWines } from '../api/wines';
import { getPublishedPosts } from '../api/blog';
import { BlogCard, FeaturedPost } from './Blog';
import dayjs from 'dayjs';
import 'dayjs/locale/nl';
import { formatTime } from '../utils/time';

dayjs.locale('nl');

const WINE_TYPE_COLORS: Record<string, string> = {
  rood: 'red', wit: 'yellow', rosé: 'pink', oranje: 'orange', mousserende: 'cyan', zoet: 'grape',
};

function SectionHeader({ eyebrow, title, subtitle, action }: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <Group justify="space-between" align="flex-end" mb="xl">
      <div>
        <Text size="xs" fw={700} tt="uppercase" c="brand" style={{ letterSpacing: 2 }} mb={4}>
          {eyebrow}
        </Text>
        <Title order={2} mb={2}>{title}</Title>
        {subtitle && <Text size="sm" c="dimmed">{subtitle}</Text>}
      </div>
      {action}
    </Group>
  );
}

function ActivityCard({ a, isSignedUp, onOpen }: {
  a: any;
  isSignedUp: boolean;
  onOpen: () => void;
}) {
  return (
    <Card withBorder radius="md" p="md" shadow="xs" style={{ display: 'flex', flexDirection: 'column' }}>
      <Group justify="space-between" mb={6}>
        <Text fw={700} size="md" lineClamp={1} style={{ flex: 1 }}>{a.name}</Text>
        <Group gap={4}>
          {isSignedUp && <Badge color="green" variant="light" size="sm">Aangemeld</Badge>}
          {a.is_public && <Badge color="teal" variant="light" size="sm">Publiek</Badge>}
        </Group>
      </Group>

      {a.description && (
        <Text size="sm" c="dimmed" lineClamp={2} mb={8}>{a.description}</Text>
      )}

      <Stack gap={4} style={{ flex: 1 }}>
        <Group gap={6}>
          <IconCalendarEvent size={14} color="var(--mantine-color-brand-6)" />
          <Text size="sm">{dayjs(a.date).format('dddd D MMMM YYYY')}</Text>
        </Group>
        {(a.start_time || a.end_time) && (
          <Group gap={6}>
            <IconClock size={14} color="var(--mantine-color-brand-6)" />
            <Text size="sm">{formatTime(a.start_time)}{a.end_time ? ` – ${formatTime(a.end_time)}` : ''}</Text>
          </Group>
        )}
        {a.location && (
          <Group gap={6}>
            <IconMapPin size={14} color="var(--mantine-color-brand-6)" />
            <Text size="sm">{a.location}</Text>
          </Group>
        )}
        {a.max_participants && (
          <Group gap={6}>
            <IconUsers size={14} color="var(--mantine-color-brand-6)" />
            <Text size="sm" c={(a.signups_count ?? 0) >= a.max_participants ? 'red' : undefined}>
              {a.signups_count ?? 0} / {a.max_participants} deelnemers
            </Text>
          </Group>
        )}
        {a.cost && (
          <Badge color="brand" variant="light" mt={4} style={{ alignSelf: 'flex-start' }}>
            € {Number(a.cost).toFixed(2)}
          </Badge>
        )}
      </Stack>

      <Button
        fullWidth
        variant="light"
        color="brand"
        size="sm"
        mt={12}
        rightSection={<IconArrowRight size={14} />}
        onClick={onOpen}
      >
        Bekijk details
      </Button>
    </Card>
  );
}

const WINE_TYPE_GRADIENTS: Record<string, string> = {
  rood:        'linear-gradient(160deg, #4a0e1a 0%, #7b1e32 60%, #a83250 100%)',
  wit:         'linear-gradient(160deg, #3a3510 0%, #6b6120 60%, #9e9040 100%)',
  rosé:        'linear-gradient(160deg, #4a1530 0%, #8b3560 60%, #c06080 100%)',
  oranje:      'linear-gradient(160deg, #3d2008 0%, #7a4010 60%, #b06828 100%)',
  mousserende: 'linear-gradient(160deg, #0e2a3a 0%, #1e5570 60%, #3088a8 100%)',
  zoet:        'linear-gradient(160deg, #2a0e40 0%, #551e7a 60%, #8840b0 100%)',
};

function WineCard({ w }: { w: any }) {
  const [photoOpen, setPhotoOpen] = useState(false);
  const gradient = WINE_TYPE_GRADIENTS[w.wine_type] ?? 'linear-gradient(160deg, #1a1a2e 0%, #2d2d4e 100%)';

  return (
    <>
      <div
        style={{
          position: 'relative',
          height: 360,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          background: w.image ? undefined : gradient,
        }}
      >
        {/* Achtergrond foto */}
        {w.image && (
          <img
            src={w.image}
            alt={w.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: w.image
            ? 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.1) 100%)'
            : 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)',
        }} />

        {/* Wijntype badge rechtsboven */}
        <div style={{ position: 'absolute', top: 14, left: 14 }}>
          <Badge color={WINE_TYPE_COLORS[w.wine_type] ?? 'gray'} variant="filled" size="sm"
            style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.15)' }}>
            {w.wine_type}
          </Badge>
        </div>

        {/* Camera knop rechtsboven */}
        {w.image && (
          <div style={{ position: 'absolute', top: 12, right: 12 }}>
            <Tooltip label="Foto bekijken">
              <ActionIcon
                variant="filled"
                size="md"
                radius="xl"
                onClick={() => setPhotoOpen(true)}
                style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <IconCamera size={15} color="white" />
              </ActionIcon>
            </Tooltip>
          </div>
        )}

        {/* Decoratief wijn-icoon als er geen foto is */}
        {!w.image && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -65%)', opacity: 0.12 }}>
            <IconGlassFull size={120} color="white" stroke={1} />
          </div>
        )}

        {/* Tekst onderaan */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 18px 16px' }}>
          {w.vintage && (
            <Text size="xs" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>
              {w.vintage}
            </Text>
          )}
          <Text fw={700} size="lg" lineClamp={1} style={{ color: 'white', lineHeight: 1.2, marginBottom: 2 }}>
            {w.name}
          </Text>
          <Text size="sm" lineClamp={1} style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
            {w.producer}{w.region ? ` · ${w.region}` : ''}{w.country ? `, ${w.country}` : ''}
          </Text>

          {w.grape_varieties?.length > 0 && (
            <Text size="xs" lineClamp={1} style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
              {w.grape_varieties.join(' · ')}
            </Text>
          )}

          {w.tasting_note && (
            <Text size="xs" lineClamp={2} style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', marginBottom: 10 }}>
              "{w.tasting_note}"
            </Text>
          )}

          {w.activity_name && (
            <Group gap={5}>
              <IconCalendarEvent size={11} color="rgba(255,255,255,0.4)" />
              <Text size="xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {w.activity_name}{w.activity_date ? ` · ${dayjs(w.activity_date).format('D MMM YYYY')}` : ''}
              </Text>
            </Group>
          )}
        </div>
      </div>

      <Modal opened={photoOpen} onClose={() => setPhotoOpen(false)} title={w.name} centered size="lg">
        <Image src={w.image} fit="contain" mah={500} radius="md" />
      </Modal>
    </>
  );
}

export default function Home() {
  const { isLoggedIn, loading } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<any[]>([]);
  const [actsLoading, setActsLoading] = useState(false);
  const [signedUpIds, setSignedUpIds] = useState<number[]>([]);
  const [homepageWines, setHomepageWines] = useState<any[]>([]);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);

  const loadActivities = useCallback(() => {
    setActsLoading(true);
    const fetch = isLoggedIn ? getUpcomingActivities() : getPublicActivities();
    fetch.then(setActivities).catch(() => {}).finally(() => setActsLoading(false));
  }, [isLoggedIn]);

  useEffect(() => {
    if (loading) return;
    loadActivities();
    getHomepageWines().then(setHomepageWines).catch(() => {});
    getPublishedPosts().then(p => setBlogPosts(p.slice(0, 4))).catch(() => {});
    if (isLoggedIn) getMySignups().then(setSignedUpIds).catch(() => {});
  }, [loading, isLoggedIn, loadActivities]);

  const featuredPost = blogPosts[0] ?? null;
  const morePosts = blogPosts.slice(1);

  const scrollToActivities = () => {
    document.getElementById('activiteiten')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div>
      {/* Hero */}
      <div style={{
        position: 'relative',
        backgroundImage: `url(${bannerImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
        minHeight: 'min(560px, 80vh)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(80,20,50,0.78) 0%, rgba(40,8,28,0.7) 100%)',
        }} />

        <Container size="md" style={{ position: 'relative', textAlign: 'center', padding: '64px 16px' }}>
          <Text size="sm" fw={700} tt="uppercase" style={{ letterSpacing: 4, color: 'rgba(255,255,255,0.75)' }} mb="xs">
            Utrechtse wijnclub
          </Text>
          <Title order={1} style={{ fontSize: 'clamp(2.2rem, 6vw, 3.4rem)', lineHeight: 1.1, color: 'white' }} mb="md">
            Château Overdruiven
          </Title>
          <Text size="lg" maw={520} mx="auto" mb="xl" style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
            Samen proeven, leren en genieten. Lees onze verhalen, blader door de wijnen
            die we dronken en ontdek wat er op de agenda staat.
          </Text>
          <Group justify="center" gap="sm">
            <Button
              size="md"
              color="brand"
              variant="white"
              c="brand.7"
              leftSection={<IconNews size={18} />}
              onClick={() => navigate('/blog')}
            >
              Lees onze blog
            </Button>
            <Button
              size="md"
              variant="outline"
              color="gray.0"
              c="white"
              style={{ borderColor: 'rgba(255,255,255,0.5)' }}
              leftSection={<IconCalendarEvent size={18} />}
              onClick={scrollToActivities}
            >
              Bekijk activiteiten
            </Button>
          </Group>
        </Container>

        <ActionIcon
          variant="transparent"
          onClick={scrollToActivities}
          aria-label="Scroll naar beneden"
          style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)' }}
        >
          <IconChevronDown size={28} color="rgba(255,255,255,0.7)" />
        </ActionIcon>
      </div>

      {/* Blog */}
      {blogPosts.length > 0 && (
        <div>
          <Container size="lg" py={56}>
            <SectionHeader
              eyebrow="Blog"
              title="Over onze wijnavonden"
              subtitle="Verhalen en hoogtepunten van onze wijnclub"
              action={
                <Button
                  variant="subtle"
                  color="brand"
                  size="sm"
                  rightSection={<IconArrowRight size={14} />}
                  onClick={() => navigate('/blog')}
                >
                  Alle berichten
                </Button>
              }
            />

            {featuredPost && (
              <FeaturedPost post={featuredPost} onOpen={() => navigate(`/blog/${featuredPost.id}`)} />
            )}

            {morePosts.length > 0 && (
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                {morePosts.map(p => <BlogCard key={p.id} post={p} />)}
              </SimpleGrid>
            )}
          </Container>
        </div>
      )}

      {/* Recente wijnen carousel */}
      {homepageWines.length > 0 && (
        <div style={{ background: 'var(--mantine-color-gray-0)' }}>
          <Container size="lg" py={56}>
            <SectionHeader
              eyebrow="Proeverijen"
              title="Gedronken wijnen"
              subtitle="Een selectie uit onze proefsessies"
            />
            <Carousel
              slideSize={{ base: '100%', sm: '50%', md: '33.333%' }}
              slideGap="lg"
              loop
              align="start"
              styles={{
                control: {
                  background: 'var(--mantine-color-brand-7)',
                  border: 'none',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  opacity: 1,
                  '&:hover': { background: 'var(--mantine-color-brand-8)' },
                },
              }}
            >
              {homepageWines.map(w => (
                <Carousel.Slide key={w.id}>
                  <WineCard w={w} />
                </Carousel.Slide>
              ))}
            </Carousel>
          </Container>
        </div>
      )}

      {/* Activiteiten */}
      <div id="activiteiten">
        <Container size="lg" py={56}>
          <SectionHeader
            eyebrow="Agenda"
            title={isLoggedIn ? 'Komende activiteiten' : 'Publieke activiteiten'}
            subtitle="Proefsessies, thema-avonden en meer"
          />

          {!isLoggedIn && (
            <Group mb="md" gap="xs" align="center">
              <IconLock size={14} color="var(--mantine-color-dimmed)" />
              <Text size="sm" c="dimmed">Log in om alle activiteiten te zien en je aan te melden.</Text>
            </Group>
          )}

          {actsLoading ? (
            <Center py={60}><Loader color="brand" type="dots" /></Center>
          ) : activities.length === 0 ? (
            <Text c="dimmed" ta="center" py={40}>Geen komende activiteiten gepland.</Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
              {activities.map(a => (
                <ActivityCard
                  key={a.id}
                  a={a}
                  isSignedUp={signedUpIds.includes(a.id)}
                  onOpen={() => navigate(`/activiteiten/${a.id}`)}
                />
              ))}
            </SimpleGrid>
          )}
        </Container>
      </div>
    </div>
  );
}
