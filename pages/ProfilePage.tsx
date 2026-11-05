/**
 * ProfilePage — user profile with progress, streak, SRS stats.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadAccount, signOut } from '../utils/account';
import { getProgressStats, getUserProgress } from '../utils/progress';
import { getStreakData, StreakDisplay, type StreakData } from '../utils/streakTracking';
import { fetchSRSStats } from '../utils/srsClient';

export function ProfilePage() {
  const navigate = useNavigate();
  const account = loadAccount();
  const [stats, setStats] = useState<ReturnType<typeof getProgressStats>>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [srs, setSrs] = useState({ total: 0, dueToday: 0, learned: 0 });
  const [progress, setProgress] = useState(getUserProgress());

  useEffect(() => {
    setStats(getProgressStats());
    setStreak(getStreakData());
    setProgress(getUserProgress());
    fetchSRSStats().then(setSrs).catch(() => {});
  }, []);

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  if (!account) {
    return (
      <div className="bg-gray-900 text-white min-h-[100dvh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No account found</p>
          <button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-950 text-white min-h-[100dvh]">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="text-blue-400 hover:text-blue-300 text-sm">
          ← Back
        </button>
        <h1 className="text-lg font-bold">Profile</h1>
        <button onClick={handleSignOut} className="text-gray-500 hover:text-red-400 text-sm">
          Sign out
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Account card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-3xl font-bold">
              {account.displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="text-xl font-bold">{account.displayName}</h2>
              <p className="text-sm text-gray-400 capitalize">{account.role}</p>
              <p className="text-xs text-gray-600">
                Joined {new Date(account.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Streak */}
        {streak && streak.currentStreak > 0 && (
          <StreakDisplay streak={streak} />
        )}

        {/* Progress stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4">📊 Learning Progress</h3>
          {stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center bg-gray-800 rounded-xl p-4">
                <div className="text-2xl font-bold text-blue-400">{stats.level}</div>
                <div className="text-xs text-gray-500 mt-1">Current Level</div>
              </div>
              <div className="text-center bg-gray-800 rounded-xl p-4">
                <div className="text-2xl font-bold text-green-400">{stats.lessonsCompleted}</div>
                <div className="text-xs text-gray-500 mt-1">Lessons Done</div>
              </div>
              <div className="text-center bg-gray-800 rounded-xl p-4">
                <div className="text-2xl font-bold text-purple-400">{stats.totalHours}h</div>
                <div className="text-xs text-gray-500 mt-1">Study Time</div>
              </div>
              <div className="text-center bg-gray-800 rounded-xl p-4">
                <div className="text-2xl font-bold text-amber-400">{stats.averageScore}%</div>
                <div className="text-xs text-gray-500 mt-1">Avg Score</div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No progress yet — start a lesson!</p>
          )}
        </div>

        {/* SRS stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4">🃏 Flashcard System</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center bg-gray-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-400">{srs.total}</div>
              <div className="text-xs text-gray-500 mt-1">Total Cards</div>
            </div>
            <div className="text-center bg-gray-800 rounded-xl p-4">
              <div className={`text-2xl font-bold ${srs.dueToday > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                {srs.dueToday}
              </div>
              <div className="text-xs text-gray-500 mt-1">Due Today</div>
            </div>
            <div className="text-center bg-gray-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-400">{srs.learned}</div>
              <div className="text-xs text-gray-500 mt-1">Learned</div>
            </div>
          </div>
        </div>

        {/* Language progress detail */}
        {progress && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4">🌍 {progress.language} Journey</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Completed Lessons</span>
                  <span className="text-gray-400">{progress.completedLessons.length}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, progress.completedLessons.length * 10)}%` }} />
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Current Position</span>
                <span>{progress.currentLevel} · Lesson {progress.currentLesson}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total Study Time</span>
                <span>{Math.round(progress.totalStudyTime / 60)} minutes</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
