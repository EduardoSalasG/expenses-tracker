import type { User } from '../domain/index.js';

export function buildFinancialAccountInvitationEmail(input: {
  accountName: string;
  inviter: User;
  recipient?: User;
  acceptanceUrl: string;
  expiresAt: string;
}) {
  const language = input.recipient?.preferredLanguage ?? input.inviter.preferredLanguage ?? 'es';
  const inviterName = input.inviter.preferredName || input.inviter.firstName || 'Expenses Tracker';
  const recipientName = input.recipient?.preferredName || input.recipient?.firstName;
  const expiry = formatExpiry(input.expiresAt, language);
  const subject = language === 'en'
    ? `${inviterName} invited you to the ${input.accountName} account in Expenses Tracker`
    : `Te invitaron a la cuenta ${input.accountName} en Expenses Tracker`;
  const greeting = recipientName
    ? language === 'en' ? `Hi ${escapeHtml(recipientName)},` : `Hola ${escapeHtml(recipientName)},`
    : language === 'en' ? 'Hi,' : 'Hola,';
  const body = language === 'en'
    ? `${escapeHtml(inviterName)} invited you to collaborate in the shared account <strong>${escapeHtml(input.accountName)}</strong>.`
    : `${escapeHtml(inviterName)} te invito a colaborar en la cuenta compartida <strong>${escapeHtml(input.accountName)}</strong>.`;
  const action = language === 'en' ? 'Accept invitation' : 'Aceptar invitacion';
  const expiration = language === 'en'
    ? `This invitation expires on ${expiry}.`
    : `Esta invitacion vence el ${expiry}.`;
  const fallback = language === 'en'
    ? 'If the button does not open, use this link:'
    : 'Si el boton no abre, usa este enlace:';

  return {
    subject,
    html: `<!doctype html>
<html lang="${language}">
  <body style="margin:0;background:#f3f6fb;color:#15213b;font-family:Arial,Helvetica,sans-serif;">
    <main style="max-width:600px;margin:0 auto;padding:32px 16px;">
      <section style="overflow:hidden;border:1px solid #d8e0ee;border-radius:8px;background:#ffffff;">
        <header style="padding:24px 28px;background:#102044;color:#ffffff;">
          <div style="display:inline-block;margin-right:10px;padding:8px 10px;border-radius:6px;background:#2457d6;font-weight:700;">ET</div>
          <span style="font-size:20px;font-weight:700;vertical-align:middle;">Expenses Tracker</span>
        </header>
        <div style="padding:28px;">
          <p style="margin:0 0 18px;font-size:18px;line-height:1.5;font-weight:700;">${greeting}</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">${body}</p>
          <p style="margin:0 0 24px;">
            <a href="${escapeAttribute(input.acceptanceUrl)}" style="display:inline-block;padding:12px 18px;border-radius:6px;background:#2457d6;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;">${action}</a>
          </p>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#52627c;">${expiration}</p>
          <p style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#52627c;">${fallback}</p>
          <p style="margin:0;word-break:break-all;font-size:13px;line-height:1.5;color:#2457d6;">${escapeHtml(input.acceptanceUrl)}</p>
        </div>
      </section>
    </main>
  </body>
</html>`,
    text: [
      language === 'en' ? `Hi${recipientName ? ` ${recipientName}` : ''},` : `Hola${recipientName ? ` ${recipientName}` : ''},`,
      '',
      language === 'en'
        ? `${inviterName} invited you to collaborate in the shared account ${input.accountName}.`
        : `${inviterName} te invito a colaborar en la cuenta compartida ${input.accountName}.`,
      '',
      `${action}: ${input.acceptanceUrl}`,
      '',
      expiration
    ].join('\n')
  };
}

function formatExpiry(value: string, language: 'es' | 'en') {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(value));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character] ?? character);
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}
