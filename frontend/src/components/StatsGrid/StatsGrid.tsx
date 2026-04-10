import { SimpleGrid, Paper, Group, Text, ThemeIcon, rem } from '@mantine/core';

interface Stat {
  title: string;
  value: string | number;
  icon: React.FC<any>;
  color?: string;
}

export default function StatsGrid({ data }: { data: Stat[] }) {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, md: data.length }} mb="xl">
      {data.map((s) => (
        <Paper withBorder p="md" radius="md" key={s.title}>
          <Group justify="space-between">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{s.title}</Text>
            <ThemeIcon color={s.color || 'brand'} variant="light" size={38} radius="md">
              <s.icon size={22} stroke={1.5} />
            </ThemeIcon>
          </Group>
          <Text fw={700} fz={rem(24)} mt={20}>{s.value}</Text>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
