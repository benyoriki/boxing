/* ============================================================
   DUEL BOXING — chat.js
   Post-match chat, only available after a match is formed.
   ============================================================ */

const ChatModule = (() => {
  let currentMatchId = null;

  function open(matchId) {
    currentMatchId = matchId;
    render();
    document.getElementById('modal-chat').classList.remove('hidden');
  }

  function render() {
    const me = getCurrentUser();
    const match = getMatchesForUser(me.username).find(m => m.id === currentMatchId);
    if (!match) return;
    const oppName = getOpponent(match, me.username);
    const opp = getUser(oppName);
    const messages = getChatMessages(currentMatchId);

    const panel = document.getElementById('chat-panel-content');
    panel.innerHTML = `
      <div class="chat-head">
        <div class="avatar-ring sm">${avatarHtml(opp.username)}</div>
        <div class="chat-head-name">${escapeHtml(opp.username)}</div>
        <div class="chat-head-actions">
          <button class="icon-btn" id="chat-report" title="Report">🚩</button>
          <button class="icon-btn" id="chat-block" title="Block">🚫</button>
          <button class="icon-btn" id="chat-close">✕</button>
        </div>
      </div>
      <div class="chat-messages" id="chat-messages">
        ${messages.length === 0 ? `<p style="text-align:center;color:var(--text-faint);font-size:12.5px;margin-top:20px;">Mulai percakapan dengan ${escapeHtml(opp.username)}</p>` :
          messages.map(m => `<div class="chat-msg ${m.from === me.username ? 'me' : 'them'}">${escapeHtml(m.text)}</div>`).join('')}
      </div>
      <div class="chat-input-row">
        <input type="text" id="chat-input" placeholder="Tulis pesan..." maxlength="300">
        <button class="chat-send" id="chat-send">➤</button>
      </div>
    `;
    document.getElementById('chat-close').onclick = () => document.getElementById('modal-chat').classList.add('hidden');
    document.getElementById('chat-report').onclick = () => reportFlow(oppName);
    document.getElementById('chat-block').onclick = () => blockFlow(oppName);
    document.getElementById('chat-send').onclick = sendMsg;
    document.getElementById('chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMsg(); });

    const box = document.getElementById('chat-messages');
    box.scrollTop = box.scrollHeight;
  }

  function sendMsg() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    const me = getCurrentUser();
    const match = getMatchesForUser(me.username).find(m => m.id === currentMatchId);
    const oppName = getOpponent(match, me.username);
    const opp = getUser(oppName);

    sendChatMessage(currentMatchId, me.username, text);
    input.value = '';
    render();

    // Bug fix: the auto-reply used to be triggered from render(), which meant
    // reopening the chat (or any unrelated re-render) could fire a fresh reply
    // to the same message over and over. Triggering it once here, right after
    // the user's own message is sent, fixes that.
    if (opp && opp.isDummy) {
      const replies = ['Siap, sampai ketemu di arena! 🥊', 'Oke, aku sudah tidak sabar!', 'Good luck buat kita berdua 💪', 'Jam berapa kamu online?'];
      showTypingBubble();
      setTimeout(() => {
        sendChatMessage(currentMatchId, oppName, replies[Math.floor(Math.random()*replies.length)]);
        if (!document.getElementById('modal-chat').classList.contains('hidden')) render();
      }, 1000 + Math.random()*1200);
    }
  }

  // Small "..." bubble shown while a dummy is "typing" a reply — purely
  // visual, removed automatically the next time render() rebuilds the list.
  function showTypingBubble() {
    const box = document.getElementById('chat-messages');
    if (!box) return;
    const bubble = document.createElement('div');
    bubble.className = 'chat-msg them typing';
    bubble.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
    box.appendChild(bubble);
    box.scrollTop = box.scrollHeight;
  }

  function reportFlow(target) {
    const reason = prompt(`Laporkan ${target}. Jelaskan alasan singkat:`);
    if (reason && reason.trim()) {
      reportUser(getCurrentUser().username, target, reason.trim());
      toast('Laporan terkirim ke admin. Terima kasih.');
    }
  }
  function blockFlow(target) {
    if (confirm(`Blokir ${target}? Kamu tidak akan melihat mereka lagi di map atau find opponent.`)) {
      blockUser(getCurrentUser().username, target);
      toast(`${target} diblokir`);
      document.getElementById('modal-chat').classList.add('hidden');
      MapModule.refresh();
    }
  }

  return { open, render, getCurrentMatchId: () => currentMatchId, showTyping: showTypingBubble };
})();
