// Page publique : connexion.
import LoginClient from './LoginClient';

export const metadata = { title: 'Connexion — Sport Evolution' };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return <LoginClient next={searchParams.next} error={searchParams.error} />;
}
