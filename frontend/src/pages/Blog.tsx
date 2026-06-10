import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container, Title, Text, SimpleGrid, Card, Group, Center, Loader, Stack,
  Paper, Badge, Button,
} from '@mantine/core';
import { IconCalendarEvent, IconUser, IconNews, IconArrowRight, IconArrowLeft, IconPlus } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import { getPublishedPosts } from '../api/blog';
import { stripHtml } from '../utils/html';
import bannerImg from '../assets/vineyard.webp';
import classes from './Blog.module.css';
import dayjs from 'dayjs';
import 'dayjs/locale/nl';

dayjs.locale('nl');

export function BlogCard({ post }: { post: any }) {
  return (
    <Card
      withBorder
      radius="md"
      p={0}
      shadow="xs"
      component={Link}
      to={`/blog/${post.id}`}
      className={classes.card}
      style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', textDecoration: 'none' }}
    >
      {post.image ? (
        <img
          src={post.image}
          alt={post.title}
          style={{ width: '100%', height: 180, objectFit: 'cover' }}
        />
      ) : (
        <Center h={180} bg="var(--mantine-color-brand-0)">
          <IconNews size={48} color="var(--mantine-color-brand-4)" stroke={1.2} />
        </Center>
      )}
      <Stack gap={6} p="md" style={{ flex: 1 }}>
        <Text fw={700} size="lg" lineClamp={2} c="dark">{post.title}</Text>
        <Text size="sm" c="dimmed" lineClamp={3} style={{ flex: 1 }}>{stripHtml(post.content)}</Text>
        <Group gap="md" mt={4}>
          <Group gap={5}>
            <IconCalendarEvent size={13} color="var(--mantine-color-brand-6)" />
            <Text size="xs" c="dimmed">{dayjs(post.created_at).format('D MMMM YYYY')}</Text>
          </Group>
          {post.author_name && (
            <Group gap={5}>
              <IconUser size={13} color="var(--mantine-color-brand-6)" />
              <Text size="xs" c="dimmed">{post.author_name}</Text>
            </Group>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

export function FeaturedPost({ post, onOpen }: { post: any; onOpen: () => void }) {
  return (
    <Paper withBorder radius="lg" shadow="sm" style={{ overflow: 'hidden' }} mb="xl">
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {post.image && (
          <div style={{ flex: '1 1 340px', minHeight: 280, position: 'relative' }}>
            <img
              src={post.image}
              alt={post.title}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}
        <div style={{ flex: '1 1 380px', padding: 'clamp(20px, 4vw, 36px)', display: 'flex', flexDirection: 'column' }}>
          <Badge variant="light" color="brand" mb="sm" style={{ alignSelf: 'flex-start' }}>
            Nieuwste bericht
          </Badge>
          <Title order={3} mb={6}>{post.title}</Title>
          <Group gap="md" mb="md">
            <Group gap={5}>
              <IconCalendarEvent size={13} color="var(--mantine-color-brand-6)" />
              <Text size="xs" c="dimmed">{dayjs(post.created_at).format('D MMMM YYYY')}</Text>
            </Group>
            {post.author_name && (
              <Group gap={5}>
                <IconUser size={13} color="var(--mantine-color-brand-6)" />
                <Text size="xs" c="dimmed">{post.author_name}</Text>
              </Group>
            )}
          </Group>
          <Text size="sm" lineClamp={7} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, flex: 1 }}>
            {stripHtml(post.content)}
          </Text>
          <Button
            variant="light"
            color="brand"
            mt="md"
            rightSection={<IconArrowRight size={14} />}
            onClick={onOpen}
            style={{ alignSelf: 'flex-start' }}
          >
            Lees verder
          </Button>
        </div>
      </div>
    </Paper>
  );
}

export default function Blog() {
  const navigate = useNavigate();
  const { isAdmin, isOrganizer } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublishedPosts().then(setPosts).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const featured = posts[0] ?? null;
  const rest = posts.slice(1);

  return (
    <div>
      {/* Banner */}
      <div style={{
        position: 'relative',
        backgroundImage: `url(${bannerImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
        minHeight: 'min(560px, 80vh)',
        color: 'white',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 16px',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(80,20,50,0.8) 0%, rgba(40,8,28,0.72) 100%)',
        }} />
        <Container size="md" style={{ position: 'relative' }}>
          <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: 3, color: 'rgba(255,255,255,0.75)' }} mb={6}>
            Château Overdruiven
          </Text>
          <Title order={1} style={{ color: 'white' }} mb={8}>Blog</Title>
          <Text maw={480} mx="auto" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Verhalen en hoogtepunten van onze wijnavonden — zo proef je alvast de sfeer.
          </Text>
        </Container>
      </div>

      <Container size="lg" py="xl">
        <Group justify="space-between" mb="lg">
          <Button
            component={Link}
            to="/"
            variant="subtle"
            color="brand"
            size="sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            Terug naar home
          </Button>
          {isOrganizer && (
            <Button
              color="brand"
              size="sm"
              leftSection={<IconPlus size={16} />}
              onClick={() => navigate(isAdmin ? '/admin/blog' : '/organisator/blog')}
            >
              Nieuw blogbericht
            </Button>
          )}
        </Group>

        {loading ? (
          <Center py={80}><Loader color="brand" type="dots" /></Center>
        ) : posts.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap="xs">
              <IconNews size={48} color="var(--mantine-color-brand-3)" stroke={1.2} />
              <Text c="dimmed">Er zijn nog geen blogposts geplaatst. Kom snel terug!</Text>
            </Stack>
          </Center>
        ) : (
          <>
            {featured && (
              <FeaturedPost post={featured} onOpen={() => navigate(`/blog/${featured.id}`)} />
            )}
            {rest.length > 0 && (
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                {rest.map(p => <BlogCard key={p.id} post={p} />)}
              </SimpleGrid>
            )}
          </>
        )}
      </Container>
    </div>
  );
}
