/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RoomState, ClientMessage, ServerMessage, Reaction } from './types';
import { Header } from './components/Header';
import { JoinScreen } from './components/JoinScreen';
import { QRCodeModal } from './components/QRCodeModal';
import { ScoreboardModal } from './components/ScoreboardModal';
import { HostLobbyView } from './components/HostLobbyView';
import { HostSongInputView } from './components/HostSongInputView';
import { HostPresentationVotingView } from './components/HostPresentationVotingView';
import { HostVoteRevealView } from './components/HostVoteRevealView';
import { HostSecretRevealView } from './components/HostSecretRevealView';
import { PlayerView } from './components/PlayerView';
import { FloatingReactions } from './components/FloatingReactions';
import { playClickSound, playVoteSound } from './utils/audio';

function generateLocalRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function App() {
  // Session & Identity
  const [playerId, setPlayerId] = useState<string>(() => {
    const saved = sessionStorage.getItem('vmc_player_id');
    if (saved) return saved;
    const newId = `player_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('vmc_player_id', newId);
    return newId;
  });

  const [playerName, setPlayerName] = useState<string>(() => {
    return sessionStorage.getItem('vmc_player_name') || '';
  });

  const [playerAvatar, setPlayerAvatar] = useState<string>(() => {
    return sessionStorage.getItem('vmc_player_avatar') || '🎸';
  });

  const [isHost, setIsHost] = useState<boolean>(() => {
    return sessionStorage.getItem('vmc_is_host') === 'true';
  });

  const [roomCode, setRoomCode] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('room');
    if (fromUrl) return fromUrl.toUpperCase().trim();
    return sessionStorage.getItem('vmc_room_code') || '';
  });

  // Room State
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [isPresenterForThisClient, setIsPresenterForThisClient] = useState<boolean>(false);
  const [myVotedSongIndex, setMyVotedSongIndex] = useState<number | null>(null);
  const [connected, setConnected] = useState<boolean>(false);

  // Modals & Floating Reactions
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);
  const [activeReactions, setActiveReactions] = useState<Reaction[]>([]);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check URL query parameters for initial setup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const roleParam = params.get('role');

    if (roomParam) {
      setRoomCode(roomParam.toUpperCase().trim());
      sessionStorage.setItem('vmc_room_code', roomParam.toUpperCase().trim());
    }
    if (roleParam === 'host') {
      setIsHost(true);
      sessionStorage.setItem('vmc_is_host', 'true');
    } else if (roleParam === 'player') {
      setIsHost(false);
      sessionStorage.setItem('vmc_is_host', 'false');
    }
  }, []);

  // Send message through WebSocket helper
  const sendMessage = useCallback((msg: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Connect to WebSocket server
  const connectWebSocket = useCallback(() => {
    if (!roomCode || !playerName) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      const joinMsg: ClientMessage = {
        type: 'join',
        roomCode,
        playerId,
        name: playerName,
        avatar: playerAvatar,
        isHost,
      };
      ws.send(JSON.stringify(joinMsg));
    };

    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        if (msg.type === 'room_state') {
          setRoomState(msg.state);
          setJoinError(null);
          setJoinBusy(false);
          if (typeof msg.isPresenterForThisClient === 'boolean') {
            setIsPresenterForThisClient(msg.isPresenterForThisClient);
          }
          if (typeof msg.myVotedSongIndex !== 'undefined') {
            setMyVotedSongIndex(msg.myVotedSongIndex);
          }
        } else if (msg.type === 'reaction_broadcast') {
          setActiveReactions((prev) => [...prev, msg.reaction]);
          setTimeout(() => {
            setActiveReactions((prev) => prev.filter((r) => r.id !== msg.reaction.id));
          }, 2500);
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Auto-reconnect after 2 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 2000);
    };

    ws.onerror = (err) => {
      console.warn('WebSocket connection error:', err);
    };
  }, [roomCode, playerName, playerAvatar, playerId, isHost]);

  useEffect(() => {
    if (roomCode && playerName) {
      connectWebSocket();
    }
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket, roomCode, playerName]);

  useEffect(() => {
    if (!roomCode || !playerName || roomState) return;
    const timeoutId = window.setTimeout(() => {
      setJoinError('サーバーに接続できません。API / WebSocket が起動しているか確認してください。');
      setJoinBusy(false);
    }, 8000);
    return () => window.clearTimeout(timeoutId);
  }, [roomCode, playerName, roomState]);

  // Host Action: Create Room
  const handleHostCreate = async (hostName: string, avatar: string) => {
    setJoinBusy(true);
    setJoinError(null);
    try {
      let newRoomCode = '';
      try {
        const res = await fetch('/api/rooms/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hostId: playerId }),
        });
        if (res.ok) {
          const data = await res.json();
          newRoomCode = data.roomCode;
        }
      } catch {
        // Fall back to a client-generated code; WebSocket join still creates the room.
      }

      if (!newRoomCode) {
        newRoomCode = generateLocalRoomCode();
      }

      setPlayerName(hostName);
      setPlayerAvatar(avatar);
      setIsHost(true);
      setRoomCode(newRoomCode);

      sessionStorage.setItem('vmc_player_name', hostName);
      sessionStorage.setItem('vmc_player_avatar', avatar);
      sessionStorage.setItem('vmc_is_host', 'true');
      sessionStorage.setItem('vmc_room_code', newRoomCode);

      const newUrl = `${window.location.pathname}?room=${newRoomCode}&role=host`;
      window.history.pushState({}, '', newUrl);
    } catch (err) {
      console.error('Failed to create room:', err);
      setJoinError('ルームを作成できませんでした。もう一度試してください。');
      setJoinBusy(false);
    }
  };

  // Player Action: Join Room
  const handlePlayerJoin = (targetCode: string, name: string, avatar: string) => {
    setJoinBusy(true);
    setJoinError(null);
    setPlayerName(name);
    setPlayerAvatar(avatar);
    setIsHost(false);
    setRoomCode(targetCode);

    sessionStorage.setItem('vmc_player_name', name);
    sessionStorage.setItem('vmc_player_avatar', avatar);
    sessionStorage.setItem('vmc_is_host', 'false');
    sessionStorage.setItem('vmc_room_code', targetCode);

    const newUrl = `${window.location.pathname}?room=${targetCode}&role=player`;
    window.history.pushState({}, '', newUrl);
  };

  // Game Control Handlers
  const handleSelectPresenter = (presenterId: string) => {
    sendMessage({ type: 'select_presenter', presenterId });
  };

  const handleSubmitSongs = (
    songs: { title: string; artist: string; comment?: string }[],
    secretDislikedIndex: number,
    secretEpisode: string
  ) => {
    sendMessage({ type: 'submit_songs', songs, secretDislikedIndex, secretEpisode });
  };

  const handleSubmitVote = (songIndex: number) => {
    setMyVotedSongIndex(songIndex);
    sendMessage({ type: 'submit_vote', songIndex });
  };

  const handleCloseVoting = () => {
    sendMessage({ type: 'close_voting' });
  };

  const handleRevealSecret = () => {
    sendMessage({ type: 'reveal_secret' });
  };

  const handleNextRound = (nextPresenterId?: string) => {
    sendMessage({ type: 'next_round', nextPresenterId });
  };

  const handleResetGame = () => {
    sendMessage({ type: 'reset_game' });
  };

  const handleSimulatePlayers = (count: number) => {
    sendMessage({ type: 'simulate_players', count });
  };

  const handleSimulateVotes = () => {
    sendMessage({ type: 'simulate_votes' });
  };

  const handleKickPlayer = (targetId: string) => {
    sendMessage({ type: 'kick_player', playerId: targetId });
  };

  const handleSendReaction = (emoji: string) => {
    sendMessage({ type: 'send_reaction', emoji });
  };

  // 1. Not in room yet -> Show Join / Create Screen
  if (!roomCode || !playerName || !roomState) {
    return (
      <div className="min-h-screen bg-[#E1DBC5] text-[#38312E] flex flex-col justify-between">
        <Header
          roomCode={roomCode}
          isHost={isHost}
          connected={connected}
          playerCount={0}
        />
        <main className="flex-1 flex items-center justify-center p-4">
          <JoinScreen
            defaultRoomCode={roomCode}
            initialRole={isHost ? 'host' : undefined}
            onHostCreate={handleHostCreate}
            onPlayerJoin={handlePlayerJoin}
            error={joinError}
            busy={joinBusy || (!!roomCode && !!playerName && !roomState)}
          />
        </main>
      </div>
    );
  }

  // Determine voted player IDs from roomState during voting phase
  const votedPlayerIds = Object.keys(roomState.currentRound.votes);

  return (
    <div className="min-h-screen bg-[#E1DBC5] text-[#38312E] flex flex-col justify-between selection:bg-[#3EE0CF] selection:text-[#38312E]">
      {/* Top Header */}
      <Header
        roomCode={roomState.roomCode}
        isHost={isHost}
        connected={connected}
        playerCount={roomState.players.length}
        onOpenQR={() => setIsQRModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 flex flex-col justify-center">
        {/* If Host Screen (Meet画面共有用) */}
        {isHost ? (
          <div className="w-full">
            {roomState.phase === 'LOBBY' && (
              <HostLobbyView
                roomCode={roomState.roomCode}
                players={roomState.players}
                onSelectPresenter={handleSelectPresenter}
                onSimulatePlayers={handleSimulatePlayers}
                onKickPlayer={handleKickPlayer}
              />
            )}

            {roomState.phase === 'SONG_INPUT' && (
              <HostSongInputView
                presenterName={roomState.currentRound.presenterName}
                presenterAvatar={roomState.currentRound.presenterAvatar}
              />
            )}

            {roomState.phase === 'PRESENTATION_AND_VOTING' && (
              <HostPresentationVotingView
                songs={roomState.currentRound.songs}
                presenterName={roomState.currentRound.presenterName}
                presenterAvatar={roomState.currentRound.presenterAvatar}
                players={roomState.players}
                votedPlayerIds={votedPlayerIds}
                onCloseVoting={handleCloseVoting}
                onSimulateVotes={handleSimulateVotes}
              />
            )}

            {roomState.phase === 'VOTE_REVEAL' && (
              <HostVoteRevealView
                songs={roomState.currentRound.songs}
                presenterName={roomState.currentRound.presenterName}
                presenterAvatar={roomState.currentRound.presenterAvatar}
                players={roomState.players}
                votes={roomState.currentRound.votes}
                onRevealSecret={handleRevealSecret}
              />
            )}

            {(roomState.phase === 'SECRET_REVEAL' || roomState.phase === 'ROUND_END') && (
              <HostSecretRevealView
                songs={roomState.currentRound.songs}
                secretDislikedIndex={roomState.currentRound.secretDislikedIndex ?? 0}
                secretEpisode={roomState.currentRound.secretEpisode || ''}
                presenterName={roomState.currentRound.presenterName}
                presenterAvatar={roomState.currentRound.presenterAvatar}
                players={roomState.players}
                votes={roomState.currentRound.votes}
                correctVoterIds={roomState.currentRound.correctVoters}
                onNextRound={() => handleNextRound()}
                onShowScoreboard={() => setIsScoreboardOpen(true)}
              />
            )}
          </div>
        ) : (
          /* If Player Screen (参加者のスマホ・手元操作用) */
          <PlayerView
            roomState={roomState}
            myPlayerId={playerId}
            isPresenter={isPresenterForThisClient}
            myVotedSongIndex={myVotedSongIndex}
            onSubmitSongs={handleSubmitSongs}
            onSubmitVote={handleSubmitVote}
            onRevealSecret={handleRevealSecret}
            onSendReaction={handleSendReaction}
          />
        )}
      </main>

      {/* Modals & Overlays */}
      <QRCodeModal
        roomCode={roomState.roomCode}
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
      />

      <ScoreboardModal
        isOpen={isScoreboardOpen}
        onClose={() => setIsScoreboardOpen(false)}
        players={roomState.players}
        roundHistory={roomState.roundHistory}
        isHost={isHost}
        onResetGame={handleResetGame}
      />

      {/* Floating Reactions Overlay */}
      <FloatingReactions reactions={activeReactions} />
    </div>
  );
}
