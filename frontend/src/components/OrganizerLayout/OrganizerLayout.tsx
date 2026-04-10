import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AppShell, Burger, Group, Text, NavLink, Avatar, UnstyledButton, Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCalendarEvent, IconArrowLeft, IconLogout } from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
import { notifications } from '@mantine/notifications';
import logoVolledig from '../../assets/logo-volledig.png';
import classes from '../AdminLayout/AdminLayout.module.css';

export default function OrganizerLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  const doLogout = () => {
    logout();
    notifications.show({ message: 'Uitgelogd!', color: 'green' });
    navigate('/');
    close();
  };

  const go = (to: string) => { navigate(to); close(); };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header>
        <div className={classes.header}>
          <div className={classes.headerLeft}>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          </div>
          <UnstyledButton component={Link} to="/">
            <img src={logoVolledig} alt="Château Overdruiven" style={{ height: 36, width: 'auto' }} />
          </UnstyledButton>
          <div className={classes.headerRight}>
            <UnstyledButton
              component={Link}
              to="/"
              style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--mantine-color-gray-6)' }}
            >
              <IconArrowLeft size={16} />
              <Text size="sm" visibleFrom="sm">Terug</Text>
            </UnstyledButton>
          </div>
        </div>
      </AppShell.Header>

      <AppShell.Navbar className={classes.navbar}>
        <div className={classes.navbarMain}>
          <Text className={classes.sectionLabel}>Beheer</Text>
          <NavLink
            label="Activiteiten"
            leftSection={<IconCalendarEvent size={18} />}
            active={loc.pathname === '/organisator/activiteiten'}
            onClick={() => go('/organisator/activiteiten')}
            color="brand"
          />
        </div>

        <div className={classes.navbarFooter}>
          <Box px="xs" py={6}>
            <Group gap="sm">
              <Avatar size={32} radius="xl" color="brand">
                {[user?.first_name, user?.last_name].filter(Boolean).map(n => n![0].toUpperCase()).join('') || (user?.username?.slice(0, 2).toUpperCase() ?? '')}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={600} truncate>{user?.username}</Text>
                <Text size="xs" c="dimmed" truncate>{user?.email}</Text>
              </div>
            </Group>
          </Box>
          <NavLink label="Uitloggen" leftSection={<IconLogout size={18} />}
            onClick={doLogout} color="red" variant="subtle" />
        </div>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
