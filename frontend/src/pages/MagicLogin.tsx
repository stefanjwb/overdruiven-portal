import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Loader, Text, Stack, Button } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { verifyMagicLink } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function MagicLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginSuccess } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Geen geldige inloglink.');
      return;
    }

    verifyMagicLink(token)
      .then(async () => {
        await loginSuccess();
        notifications.show({ message: 'Welkom terug!', color: 'green' });
        navigate('/');
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'De link is ongeldig of verlopen.');
      });
  }, []);

  return (
    <Container size={420} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Stack align="center" gap="md">
        {error ? (
          <>
            <Text c="red" ta="center">{error}</Text>
            <Button color="brand" onClick={() => navigate('/login')}>
              Terug naar inloggen
            </Button>
          </>
        ) : (
          <>
            <Loader color="brand" size="lg" />
            <Text c="dimmed">Bezig met inloggen…</Text>
          </>
        )}
      </Stack>
    </Container>
  );
}
