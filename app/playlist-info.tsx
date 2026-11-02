import PlaylistInfoScreen from '@/components/lastplayed/lastplayed';
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';

export default function PlaylistInfo() {
  // When something is playing, open the REAL player (never a story-info
  // pop-up). The info sheet is only the fallback when nothing is loaded.
  const isActive = useSelector((s: RootState) => s.player.isActive);

  if (isActive) {
    return <Redirect href="/player-standard" />;
  }

  return <PlaylistInfoScreen />;
}
