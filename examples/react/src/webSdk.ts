import ProtonWebSDK, { ProtonWebLink, LinkSession, TransactResult, Link } from '@proton/web-sdk';
import { Serialize, JsonRpc, RpcInterfaces } from '@proton/js';

export let link: ProtonWebLink | Link | undefined;
export let session: LinkSession | undefined;

const REQUEST_ACCOUNT = 'taskly'
const CHAIN_ID = '384da888112027f0321850a169f737c33e53b388aad48b5adace4bab97f437e0'
const ENDPOINTS = ['https://proton.greymass.com']

const rpc = new JsonRpc(ENDPOINTS)

export const createLink = async ({
  restoreSession = false,
}: {
  restoreSession?: boolean;
}): Promise<void> => {
  const { link: localLink, session: localSession } = await ProtonWebSDK({
    linkOptions: {
      endpoints: ENDPOINTS,
      chainId: CHAIN_ID,
      restoreSession,
    },
    transportOptions: {
      requestAccount: REQUEST_ACCOUNT,
      requestStatus: false,
      backButton: true,
    },
    selectorOptions: {
      appName: 'Proton Swap',
    },
  });
  link = localLink;
  session = localSession;
};

export const login = async (): Promise<LinkSession> => {
  await createLink({ restoreSession: false });
  if (session) {
    return session;
  } else {
    throw new Error('No Session');
  }
};

export const transact = async (
  actions: Serialize.Action[],
  broadcast: boolean
): Promise<TransactResult> => {
  if (session) {
    return session.transact(
      {
        transaction: {
          actions,
        } as never,
      },
      { broadcast }
    );
  } else {
    throw new Error('No Session');
  }
};

export const logout = async (): Promise<void> => {
  if (link && session) {
    await link.removeSession(REQUEST_ACCOUNT, session.auth, CHAIN_ID);
  }
  session = undefined;
  link = undefined;
};

export const reconnect = async (): Promise<LinkSession | undefined> => {
  if (!session) {
    await createLink({ restoreSession: true });
  }

  if (session) {
    return session;
  }
};

export const transfer = async ({ to, amount }: { to: string, amount: string }) => {
  if (!session) {
    throw new Error('No Session');
  }

  return await session.transact({
    actions: [{
        // Token contract for only XPR
        // Other tokens like XUSDC have contract "xtokens"
        account: "eosio.token",

        // Action name
        name: "transfer",
        
        // Action parameters
        data: {
            from: session.auth.actor,
            to: to,
            // Change precision from 4 for other assets, e.g. 6 for USDC
            quantity: `${(+amount).toFixed(4)} XPR`,
            memo: ""
        },
        authorization: [session.auth]
    }]
  }, {
    broadcast: true
  })
}

export async function getProtonAvatar (account: string): Promise<RpcInterfaces.UserInfo | undefined> {
  try {
    const result = await rpc.get_table_rows({
      code: 'eosio.proton',
      scope: 'eosio.proton',
      table: 'usersinfo',
      key_type: 'i64',
      lower_bound: account,
      index_position: 1,
      limit: 1
    })

    if (result.rows.length > 0 && result.rows[0].acc === account) {
      return result.rows[0]
    }
  } catch (e) {
    console.error('getProtonAvatar error', e)
  }

  return undefined
}