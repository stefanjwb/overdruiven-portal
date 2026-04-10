import { useState, useRef } from 'react';
import {
  Container, Title, Paper, Stack, Avatar, Text, Button, PasswordInput,
  Group, Divider, FileButton, ActionIcon, Badge,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCamera, IconX, IconCheck } from '@tabler/icons-react';
import { updateMe } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [avatar, setAvatar] = useState<string | null | undefined>(user?.avatar);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const resetRef = useRef<() => void>(null);

  const displayName = user?.first_name
    ? user.first_name.charAt(0).toUpperCase() + user.first_name.slice(1).toLowerCase()
    : user?.username ?? '';

  const initials = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join('') || (user?.username?.slice(0, 2).toUpperCase() ?? '');

  const pwForm = useForm({
    initialValues: { current_password: '', new_password: '', confirm_password: '' },
    validate: {
      current_password: (v) => (v ? null : 'Vul je huidige wachtwoord in'),
      new_password: (v) => {
        if (v.length < 8) return 'Minimaal 8 tekens';
        if (!/[A-Z]/.test(v)) return 'Minimaal 1 hoofdletter';
        if (!/\d/.test(v)) return 'Minimaal 1 cijfer';
        return null;
      },
      confirm_password: (v, vals) => (v === vals.new_password ? null : 'Wachtwoorden komen niet overeen'),
    },
  });

  const handleAvatarFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setAvatar(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const saveAvatar = async () => {
    setAvatarBusy(true);
    try {
      await updateMe({ avatar: avatar ?? null });
      await refreshUser();
      notifications.show({ message: 'Profielfoto opgeslagen.', color: 'green', icon: <IconCheck size={16} /> });
    } catch {
      notifications.show({ message: 'Opslaan mislukt.', color: 'red' });
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    setAvatar(null);
    resetRef.current?.();
    setAvatarBusy(true);
    try {
      await updateMe({ avatar: null });
      await refreshUser();
      notifications.show({ message: 'Profielfoto verwijderd.', color: 'green' });
    } catch {
      notifications.show({ message: 'Verwijderen mislukt.', color: 'red' });
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleChangePassword = async (values: typeof pwForm.values) => {
    try {
      await updateMe({ current_password: values.current_password, new_password: values.new_password });
      notifications.show({ message: 'Wachtwoord gewijzigd.', color: 'green', icon: <IconCheck size={16} /> });
      pwForm.reset();
    } catch (err: any) {
      notifications.show({
        title: 'Fout',
        message: err.response?.data?.detail || 'Er is iets misgegaan.',
        color: 'red',
      });
    }
  };

  return (
    <Container size="sm" py="xl">
      <Title order={2} mb="lg">Mijn profiel</Title>

      {/* Profielfoto */}
      <Paper withBorder radius="md" p="lg" mb="lg">
        <Text fw={600} mb="md">Profielfoto</Text>
        <Group align="flex-end" gap="lg">
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <Avatar src={avatar} size={96} radius="xl" color="brand">
              {initials}
            </Avatar>
            {avatar && (
              <ActionIcon
                size="sm"
                color="red"
                variant="filled"
                radius="xl"
                style={{ position: 'absolute', top: 0, right: 0 }}
                onClick={removeAvatar}
                loading={avatarBusy}
              >
                <IconX size={12} />
              </ActionIcon>
            )}
          </div>
          <Stack gap="xs">
            <Text size="sm" fw={600}>{displayName}</Text>
            <Text size="xs" c="dimmed">{user?.email}</Text>
            <Badge color="brand" variant="light" size="sm">{user?.role}</Badge>
            <Group gap="xs">
              <FileButton resetRef={resetRef} onChange={handleAvatarFile} accept="image/*">
                {(props) => (
                  <Button {...props} variant="light" color="brand" size="xs" leftSection={<IconCamera size={14} />}>
                    {avatar ? 'Foto wijzigen' : 'Foto toevoegen'}
                  </Button>
                )}
              </FileButton>
              {avatar !== user?.avatar && (
                <Button size="xs" color="brand" loading={avatarBusy} onClick={saveAvatar}>
                  Opslaan
                </Button>
              )}
            </Group>
          </Stack>
        </Group>
      </Paper>

      {/* Wachtwoord wijzigen */}
      <Paper withBorder radius="md" p="lg">
        <Text fw={600} mb="md">Wachtwoord wijzigen</Text>
        <form onSubmit={pwForm.onSubmit(handleChangePassword)}>
          <Stack gap="md">
            <PasswordInput
              label="Huidig wachtwoord"
              placeholder="••••••••"
              required
              {...pwForm.getInputProps('current_password')}
            />
            <Divider />
            <PasswordInput
              label="Nieuw wachtwoord"
              placeholder="Minimaal 8 tekens, 1 hoofdletter, 1 cijfer"
              required
              {...pwForm.getInputProps('new_password')}
            />
            <PasswordInput
              label="Nieuw wachtwoord bevestigen"
              placeholder="Herhaal je nieuwe wachtwoord"
              required
              {...pwForm.getInputProps('confirm_password')}
            />
            <Button type="submit" color="brand" w="fit-content">
              Wachtwoord opslaan
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
