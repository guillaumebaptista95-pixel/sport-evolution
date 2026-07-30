// Espace membre : mesures et reglages.
import { getProfile, getRecentWorkouts } from '@/lib/queries';
import ProfileClient from '@/components/ProfileClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Profil — Sport Evolution' };

export default async function ProfilPage() {
  const [profile, workouts] = await Promise.all([getProfile(), getRecentWorkouts(200)]);
  const done = workouts.filter((w) => w.ended_at);

  return (
    <ProfileClient
      profile={profile}
      stats={{
        workouts: done.length,
        sets: done.reduce((a, w) => a + w.workout_sets.length, 0),
        since: done.length ? done[done.length - 1].performed_on : null,
      }}
    />
  );
}
