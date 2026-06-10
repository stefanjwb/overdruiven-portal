import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Container, Title, Text, Group, Center, Loader, Button, Image, Divider,
  TypographyStylesProvider,
} from '@mantine/core';
import { IconCalendarEvent, IconUser, IconArrowLeft } from '@tabler/icons-react';
import { getPost } from '../api/blog';
import { looksLikeHtml, sanitizeHtml } from '../utils/html';
import dayjs from 'dayjs';
import 'dayjs/locale/nl';

dayjs.locale('nl');

export default function BlogPostDetail() {
  const { id } = useParams();
  const [post, setPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getPost(Number(id)).then(setPost).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Center py={120}><Loader color="brand" type="dots" /></Center>;

  if (!post) {
    return (
      <Container size="sm" py="xl">
        <Center py={60}>
          <div style={{ textAlign: 'center' }}>
            <Text c="dimmed" mb="md">Deze blogpost bestaat niet (meer).</Text>
            <Button component={Link} to="/blog" variant="light" color="brand" leftSection={<IconArrowLeft size={16} />}>
              Terug naar de blog
            </Button>
          </div>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="sm" py="xl">
      <Button
        component={Link}
        to="/blog"
        variant="subtle"
        color="brand"
        size="xs"
        leftSection={<IconArrowLeft size={14} />}
        mb="lg"
      >
        Alle blogposts
      </Button>

      <Title order={1} mb="sm">{post.title}</Title>

      <Group gap="md" mb="lg">
        <Group gap={5}>
          <IconCalendarEvent size={14} color="var(--mantine-color-brand-6)" />
          <Text size="sm" c="dimmed">{dayjs(post.created_at).format('D MMMM YYYY')}</Text>
        </Group>
        {post.author_name && (
          <Group gap={5}>
            <IconUser size={14} color="var(--mantine-color-brand-6)" />
            <Text size="sm" c="dimmed">{post.author_name}</Text>
          </Group>
        )}
      </Group>

      {post.image && (
        <Image src={post.image} alt={post.title} radius="md" mb="lg" mah={420} fit="cover" />
      )}

      <Divider mb="lg" />

      {looksLikeHtml(post.content) ? (
        <TypographyStylesProvider>
          <div
            style={{ lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
          />
        </TypographyStylesProvider>
      ) : (
        <Text style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{post.content}</Text>
      )}
    </Container>
  );
}
