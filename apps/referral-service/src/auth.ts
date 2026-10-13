import { randomBytes } from 'node:crypto';
import { address, ApiError, CHAIN_ID, CHALLENGE_MS, FIRST_TOUCH_MS, PURPOSE, SESSION_MS, type Challenge } from './model.ts';
import { ReferralStore } from './store.ts';

export type SignatureVerifier = (wallet: string, message: string, signature: `0x${string}`) => Promise<boolean>;
export class ReferralAuth {
  readonly origin: string;
  private store: ReferralStore;
  private verifySignature: SignatureVerifier;
  private associationBlock: () => Promise<number>;
  private clock: () => number;
  constructor(store: ReferralStore, origin: string, verifySignature: SignatureVerifier, associationBlock: () => Promise<number>, clock=Date.now) {
    this.store=store;this.verifySignature=verifySignature;this.associationBlock=associationBlock;this.clock=clock;
    const parsed = new URL(origin);
    if (!['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname!=='/' || parsed.search || parsed.hash) throw Error('REFERRAL_ORIGIN must be an exact HTTP(S) application origin');
    this.origin = parsed.origin;
  }
  challenge(input: {wallet: unknown; referrer?: unknown; firstSeenAt?: unknown}): Challenge {
    const now=this.clock(); const wallet=address(input.wallet); const referrer=input.referrer==null?null:address(input.referrer);
    if(referrer===wallet)throw new ApiError(400,'SELF_REFERRAL');
    const existing=this.store.association(wallet);
    if(existing && referrer && existing.referrerWallet!==referrer)throw new ApiError(409,'REFERRER_IMMUTABLE');
    const firstSeenAt=input.firstSeenAt===undefined?now:input.firstSeenAt;
    if(typeof firstSeenAt!=='number'||!Number.isSafeInteger(firstSeenAt)||firstSeenAt>now||firstSeenAt<now-FIRST_TOUCH_MS)throw new ApiError(400,'INVALID_FIRST_SEEN');
    const id=randomBytes(24).toString('hex'); const nonce=randomBytes(24).toString('hex'); const expiresAt=now+CHALLENGE_MS;
    const message=`${new URL(this.origin).host} requests a RetroPick referral association.\n\nWallet: ${wallet}\nURI: ${this.origin}\nChain ID: ${CHAIN_ID}\nNonce: ${nonce}\nIssued At: ${new Date(now).toISOString()}\nExpiration Time: ${new Date(expiresAt).toISOString()}\nReferrer: ${referrer??'None'}\nPurpose: ${PURPOSE}`;
    const c={id,wallet,referrer,nonce,message,createdAt:now,expiresAt,firstSeenAt};this.store.addChallenge(c);return c;
  }
  async verify(input: {challengeId: unknown; signature: unknown}) {
    if(typeof input.challengeId!=='string'||!/^[\da-f]{48}$/.test(input.challengeId)||typeof input.signature!=='string'||!/^0x[\da-fA-F]{128,4096}$/.test(input.signature))throw new ApiError(400,'INVALID_SIGNATURE_REQUEST');
    const c=this.store.takeChallenge(input.challengeId,this.clock());
    if(!c.message.startsWith(`${new URL(this.origin).host} requests a RetroPick referral association.\n`)
      ||!c.message.includes(`\nURI: ${this.origin}\n`))throw new ApiError(403,'CHALLENGE_ORIGIN_MISMATCH');
    if(!await this.verifySignature(c.wallet,c.message,input.signature as `0x${string}`))throw new ApiError(401,'INVALID_SIGNATURE');
    const block=await this.associationBlock(); const now=this.clock();
    if(now>=c.expiresAt)throw new ApiError(401,'CHALLENGE_EXPIRED_OR_USED');
    if(!Number.isSafeInteger(block)||block<0)throw new ApiError(503,'CHAIN_UNAVAILABLE');
    this.store.associate(c,block,now);
    const token=randomBytes(32).toString('hex');this.store.addSession(token,c.wallet,now+SESSION_MS);
    return {token,wallet:c.wallet};
  }
}
