import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useWindowScroll } from '@mantine/hooks';
import {
  AppShell, Group, Text, UnstyledButton, Button, Menu, Avatar, rem, ActionIcon,
} from '@mantine/core';
import {
  IconLogout, IconSettings, IconLayoutDashboard, IconBooks, IconLogin, IconUser, IconReceipt,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../context/AuthContext';
import logoVolledig from '../../assets/logo-volledig.png';
import logoKlein from '../../assets/logo-klein.png';
import classes from './PublicLayout.module.css';

export default function PublicLayout() {
  const { user, isLoggedIn, isAdmin, isOrganizer, logout } = useAuth();
  const navigate = useNavigate();
  const [scroll] = useWindowScroll();
  const isScrolled = scroll.y > 20;

  const doLogout = () => {
    logout();
    notifications.show({ message: 'Uitgelogd!', color: 'green' });
    navigate('/');
  };

  return (
    <AppShell header={{ height: 60 }} padding={0}>
      <AppShell.Header style={{
        background: isScrolled ? 'white' : 'transparent',
        backdropFilter: isScrolled ? 'none' : 'blur(4px)',
        borderBottom: isScrolled ? undefined : 'none',
        transition: 'background 300ms ease, border 300ms ease',
        boxShadow: isScrolled ? 'var(--mantine-shadow-sm)' : 'none',
      }}>
        <div className={classes.header}>
          <UnstyledButton component={Link} to="/" className={classes.logoGroup}>
            <img src={logoVolledig} alt="Château Overdruiven" className={classes.logoVolledig} />
            <img src={logoKlein} alt="Château Overdruiven" className={classes.logoKlein} />
          </UnstyledButton>

          <div className={classes.headerRight}>
          <Group gap="sm">
            {isLoggedIn ? (
              <Menu shadow="md" width={220} position="bottom-end">
                <Menu.Target>
                  <UnstyledButton style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar size={34} radius="xl" color="brand">
                      {[user?.first_name, user?.last_name].filter(Boolean).map(n => n![0].toUpperCase()).join('') || (user?.username?.slice(0, 2).toUpperCase() ?? '')}
                    </Avatar>
                    <div style={{ lineHeight: 1.2 }}>
                      <Text size="sm" fw={600} c="brand">
                        {user?.first_name
                          ? user.first_name.charAt(0).toUpperCase() + user.first_name.slice(1).toLowerCase()
                          : user?.username}
                      </Text>
                      <Text size="xs" c="dimmed">{user?.role}</Text>
                    </div>
                  </UnstyledButton>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Panels</Menu.Label>
                  {isAdmin && (
                    <Menu.Item
                      leftSection={<IconSettings size={rem(16)} />}
                      onClick={() => navigate('/admin/gebruikers')}
                    >
                      Admin panel
                    </Menu.Item>
                  )}
                  {isOrganizer && (
                    <Menu.Item
                      leftSection={<IconLayoutDashboard size={rem(16)} />}
                      onClick={() => navigate('/organisator/activiteiten')}
                    >
                      Organisator panel
                    </Menu.Item>
                  )}
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconUser size={rem(16)} />}
                    onClick={() => navigate('/profiel')}
                  >
                    Mijn profiel
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconBooks size={rem(16)} />}
                    onClick={() => navigate('/bibliotheek')}
                  >
                    Mijn wijnbibliotheek
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconReceipt size={rem(16)} />}
                    onClick={() => navigate('/declaraties')}
                  >
                    Mijn declaraties
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    leftSection={<IconLogout size={rem(16)} />}
                    onClick={doLogout}
                  >
                    Uitloggen
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : (
              <ActionIcon color="brand" variant="filled" size="lg" component={Link} to="/login" aria-label="Inloggen">
                <IconLogin size={20} />
              </ActionIcon>
            )}
          </Group>
          </div>
        </div>
      </AppShell.Header>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
