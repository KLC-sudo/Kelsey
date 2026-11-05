import React from 'react';
import { useAppContext } from '../context/AppContext';
import { AuthGate } from '../components/AuthGate';

export function AuthPage() {
  const { dispatch } = useAppContext();
  return <AuthGate onAuthenticated={() => dispatch({ type: 'SET_AUTH', isAuthed: true })} />;
}
