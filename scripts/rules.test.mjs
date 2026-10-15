import {readFile} from 'node:fs/promises';
import {after, before, beforeEach, test} from 'node:test';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc} from 'firebase/firestore';

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-cliphouse',
    firestore: {host: '127.0.0.1', port: 8080, rules: await readFile('firestore.rules', 'utf8')},
  });
});
beforeEach(async () => env.clearFirestore());
after(async () => env?.cleanup());

test('an owner can star, list, update, and unstar a video', async () => {
  const db = env.authenticatedContext('alice').firestore();
  const bookmark = doc(db, 'users/alice/bookmarks/stack-orbit');
  await assertSucceeds(setDoc(bookmark, {variantId: 'stack-orbit', savedAt: serverTimestamp()}));
  await assertSucceeds(getDocs(collection(db, 'users/alice/bookmarks')));
  await assertSucceeds(setDoc(bookmark, {variantId: 'stack-orbit', savedAt: serverTimestamp()}));
  await assertSucceeds(deleteDoc(bookmark));
});

test('other accounts and anonymous visitors cannot read or modify private stars', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/alice/bookmarks/stack-orbit'), {variantId: 'stack-orbit', savedAt: new Date()});
  });
  for (const context of [env.authenticatedContext('bob'), env.unauthenticatedContext()]) {
    const db = context.firestore();
    const bookmark = doc(db, 'users/alice/bookmarks/stack-orbit');
    await assertFails(getDoc(bookmark));
    await assertFails(getDocs(collection(db, 'users/alice/bookmarks')));
    await assertFails(setDoc(bookmark, {variantId: 'stack-orbit', savedAt: serverTimestamp()}));
    await assertFails(deleteDoc(bookmark));
  }
});

test('invalid payloads, forged timestamps, extra fields and unrelated paths are rejected', async () => {
  const db = env.authenticatedContext('alice').firestore();
  const bookmark = doc(db, 'users/alice/bookmarks/stack-orbit');
  for (const data of [
    {variantId: 'other', savedAt: serverTimestamp()},
    {variantId: 'stack-orbit', savedAt: new Date(0)},
    {variantId: 'stack-orbit'},
    {variantId: 'stack-orbit', savedAt: serverTimestamp(), email: 'not-stored@example.com'},
  ]) await assertFails(setDoc(bookmark, data));
  await assertFails(setDoc(doc(db, 'users/alice/bookmarks/INVALID'), {variantId: 'INVALID', savedAt: serverTimestamp()}));
  await assertFails(setDoc(doc(db, 'users/alice'), {admin: true}));
  await assertFails(getDocs(collection(db, 'users')));
});

test('share metadata is private and publishing cannot bypass the backend', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/alice/shares/test-share'), {id: 'test-share', title: 'Private list', createdAt: 1});
    await setDoc(doc(context.firestore(), 'shares/test-share'), {owner: 'alice', props: {}});
  });
  const alice = env.authenticatedContext('alice').firestore();
  await assertSucceeds(getDocs(collection(alice, 'users/alice/shares')));
  for (const context of [env.authenticatedContext('alice'), env.authenticatedContext('bob'), env.unauthenticatedContext()]) {
    const db = context.firestore();
    await assertFails(getDoc(doc(db, 'shares/test-share')));
    await assertFails(setDoc(doc(db, 'shares/test-share'), {owner: 'alice', props: {}}));
    await assertFails(setDoc(doc(db, 'users/alice/shares/test-share'), {title: 'Forged'}));
    await assertFails(deleteDoc(doc(db, 'users/alice/shares/test-share')));
    await assertFails(getDocs(collection(db, 'shareJobs')));
    await assertFails(setDoc(doc(db, 'shareQuota/today'), {count: 0}));
  }
  for (const context of [env.authenticatedContext('bob'), env.unauthenticatedContext()]) {
    await assertFails(getDocs(collection(context.firestore(), 'users/alice/shares')));
  }
});

const draftId = 'a'.repeat(32);
const verified = {email_verified: true, firebase: {sign_in_provider: 'google.com'}};
const draft = () => ({variantId: 'stack-orbit', propsJson: '{"texts":{},"theme":{}}', title: 'Private edit', updatedAt: serverTimestamp()});
test('verified owners can save, reopen, update, list and delete private drafts', async () => {
  const db = env.authenticatedContext('alice', verified).firestore();
  const ref = doc(db, `users/alice/drafts/${draftId}`);
  await assertSucceeds(setDoc(ref, draft()));
  await assertSucceeds(getDoc(ref));
  await assertSucceeds(getDocs(collection(db, 'users/alice/drafts')));
  await assertSucceeds(setDoc(ref, {...draft(), title: 'Changed title'}));
  await assertSucceeds(setDoc(ref, {...draft(), templateVersion: 2}));
  await assertSucceeds(deleteDoc(ref));
});
test('drafts reject other users, anonymous visitors and unverified accounts', async () => {
  await env.withSecurityRulesDisabled((context) => setDoc(doc(context.firestore(), `users/alice/drafts/${draftId}`), draft()));
  for (const context of [env.authenticatedContext('bob', verified), env.unauthenticatedContext(), env.authenticatedContext('alice')]) {
    const db = context.firestore();
    const ref = doc(db, `users/alice/drafts/${draftId}`);
    await assertFails(getDoc(ref));
    await assertFails(getDocs(collection(db, 'users/alice/drafts')));
    await assertFails(setDoc(ref, draft()));
    await assertFails(deleteDoc(ref));
  }
});
test('drafts reject oversized content, extra fields and forged timestamps', async () => {
  const db = env.authenticatedContext('alice', verified).firestore();
  const ref = doc(db, `users/alice/drafts/${draftId}`);
  for (const value of [
    {...draft(), propsJson: 'x'.repeat(12001)}, {...draft(), propsJson: {}},
    {...draft(), title: ''}, {...draft(), title: 'x'.repeat(121)},
    {...draft(), public: true}, {...draft(), updatedAt: new Date(0)},
    {...draft(), templateVersion: '1'}, {...draft(), templateVersion: 0}, {...draft(), templateVersion: 1.5},
  ]) await assertFails(setDoc(ref, value));
});

test('hashed API keys are closed to clients and owners can only read their own key index', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'apiKeys/abc123'), {id: 'k1', owner: 'alice', createdAt: 1, revoked: false});
    await setDoc(doc(db, 'users/alice/apiKeys/k1'), {createdAt: 1, last4: 'wxyz', hash: 'abc123'});
  });
  const alice = env.authenticatedContext('alice').firestore();
  await assertSucceeds(getDoc(doc(alice, 'users/alice/apiKeys/k1')));
  await assertSucceeds(getDocs(collection(alice, 'users/alice/apiKeys')));
  await assertFails(setDoc(doc(alice, 'users/alice/apiKeys/k2'), {createdAt: 2, last4: 'abcd', hash: 'def'}));
  await assertFails(deleteDoc(doc(alice, 'users/alice/apiKeys/k1')));
  for (const context of [env.authenticatedContext('alice'), env.authenticatedContext('bob'), env.unauthenticatedContext()]) {
    const db = context.firestore();
    await assertFails(getDoc(doc(db, 'apiKeys/abc123')));
    await assertFails(setDoc(doc(db, 'apiKeys/forged'), {id: 'x', owner: 'bob', createdAt: 1, revoked: false}));
  }
  for (const context of [env.authenticatedContext('bob'), env.unauthenticatedContext()]) {
    await assertFails(getDoc(doc(context.firestore(), 'users/alice/apiKeys/k1')));
  }
});

test('search and event logs are closed to every client', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'searches/s1'), {query: 'x', caller: 'ip:1.2.3.4'});
    await setDoc(doc(context.firestore(), 'events/e1'), {type: 'spec'});
    await setDoc(doc(context.firestore(), 'previewQuota/2026-10-15'), {count: 1});
  });
  for (const context of [env.authenticatedContext('alice'), env.unauthenticatedContext()]) {
    const db = context.firestore();
    for (const path of ['searches/s1', 'events/e1', 'previewQuota/2026-10-15']) await assertFails(getDoc(doc(db, path)));
    await assertFails(getDocs(collection(db, 'searches')));
    await assertFails(setDoc(doc(db, 'searches/forged'), {query: 'x'}));
    await assertFails(setDoc(doc(db, 'events/forged'), {type: 'spec'}));
  }
});
