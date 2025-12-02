/**
 * Script to set up owner user for akhare@brighttier.com
 * Run this once to ensure the user has full owner access
 *
 * This can be run from the browser console or as a one-time setup
 */

import {
  getAppUserByEmail,
  createAppUser,
  updateAppUser,
  createOrganization,
  getOrganizationByOwner
} from '../services/firestoreService';
import { DEFAULT_ROLE_PERMISSIONS } from '../types';

const OWNER_EMAIL = 'akhare@brighttier.com';
const OWNER_NAME = 'Akhare';
const ORG_NAME = 'Brighttier';

export async function setupOwnerUser(firebaseUid: string): Promise<void> {
  console.log(`Setting up owner user: ${OWNER_EMAIL}`);

  // Check if user already exists
  const existingUser = await getAppUserByEmail(OWNER_EMAIL);

  if (existingUser) {
    console.log('User already exists, updating to owner role...');

    // Update to owner with full permissions
    await updateAppUser(existingUser.id, {
      role: 'owner',
      permissions: DEFAULT_ROLE_PERMISSIONS.owner,
      isActive: true,
    });

    console.log('User updated to owner successfully!');
    return;
  }

  // Check if organization exists
  let orgId: string;
  const existingOrg = await getOrganizationByOwner(firebaseUid);

  if (existingOrg) {
    console.log('Organization already exists:', existingOrg.name);
    orgId = existingOrg.id;
  } else {
    console.log('Creating new organization...');
    orgId = await createOrganization({
      name: ORG_NAME,
      ownerId: firebaseUid,
      ownerEmail: OWNER_EMAIL.toLowerCase(),
    });
    console.log('Organization created:', orgId);
  }

  // Create the owner user
  console.log('Creating owner user...');
  const userId = await createAppUser({
    organizationId: orgId,
    email: OWNER_EMAIL.toLowerCase(),
    name: OWNER_NAME,
    role: 'owner',
    permissions: DEFAULT_ROLE_PERMISSIONS.owner,
    isActive: true,
  });

  console.log('Owner user created successfully!', userId);
}

// Export for use in app
export { OWNER_EMAIL, OWNER_NAME, ORG_NAME };
