import { updateSubscription } from './firestoreService';
import type { Subscription } from '../types';

// Mapping of vendor keywords to categories
const VENDOR_CATEGORY_MAP: Record<string, string> = {
  // Cloud & Infrastructure
  aws: 'Cloud & Infrastructure',
  'amazon web services': 'Cloud & Infrastructure',
  azure: 'Cloud & Infrastructure',
  'google cloud': 'Cloud & Infrastructure',
  gcp: 'Cloud & Infrastructure',
  digitalocean: 'Cloud & Infrastructure',
  heroku: 'Cloud & Infrastructure',
  vercel: 'Cloud & Infrastructure',
  netlify: 'Cloud & Infrastructure',
  cloudflare: 'Cloud & Infrastructure',
  firebase: 'Cloud & Infrastructure',
  linode: 'Cloud & Infrastructure',
  vultr: 'Cloud & Infrastructure',
  railway: 'Cloud & Infrastructure',
  render: 'Cloud & Infrastructure',

  // Software / Productivity
  microsoft: 'Software',
  'office 365': 'Software',
  'microsoft 365': 'Software',
  docusign: 'Software',
  pandadoc: 'Software',
  hellosign: 'Software',
  'adobe sign': 'Software',
  google: 'Productivity',
  'google workspace': 'Productivity',
  notion: 'Productivity',
  airtable: 'Productivity',
  monday: 'Productivity',
  asana: 'Productivity',
  clickup: 'Productivity',
  trello: 'Productivity',
  todoist: 'Productivity',
  evernote: 'Productivity',
  dropbox: 'Productivity',
  box: 'Productivity',

  // Communication
  slack: 'Communication',
  zoom: 'Communication',
  teams: 'Communication',
  discord: 'Communication',
  intercom: 'Communication',
  zendesk: 'Communication',
  freshdesk: 'Communication',
  twilio: 'Communication',
  calendly: 'Communication',
  loom: 'Communication',

  // Design
  figma: 'Design',
  adobe: 'Design',
  canva: 'Design',
  sketch: 'Design',
  invision: 'Design',
  miro: 'Design',
  framer: 'Design',
  webflow: 'Design',

  // Development
  github: 'Development',
  gitlab: 'Development',
  bitbucket: 'Development',
  jira: 'Development',
  atlassian: 'Development',
  jetbrains: 'Development',
  postman: 'Development',
  docker: 'Development',
  npm: 'Development',
  sentry: 'Development',
  datadog: 'Development',
  newrelic: 'Development',
  'new relic': 'Development',
  linear: 'Development',

  // Marketing
  hubspot: 'Marketing',
  mailchimp: 'Marketing',
  sendgrid: 'Marketing',
  mailgun: 'Marketing',
  'constant contact': 'Marketing',
  hootsuite: 'Marketing',
  buffer: 'Marketing',
  semrush: 'Marketing',
  ahrefs: 'Marketing',
  moz: 'Marketing',
  sprout: 'Marketing',
  convertkit: 'Marketing',
  activecampaign: 'Marketing',

  // Analytics
  mixpanel: 'Analytics',
  amplitude: 'Analytics',
  'google analytics': 'Analytics',
  hotjar: 'Analytics',
  fullstory: 'Analytics',
  heap: 'Analytics',
  segment: 'Analytics',
  tableau: 'Analytics',
  looker: 'Analytics',
  metabase: 'Analytics',

  // Security
  '1password': 'Security',
  lastpass: 'Security',
  dashlane: 'Security',
  bitwarden: 'Security',
  okta: 'Security',
  auth0: 'Security',
  crowdstrike: 'Security',
  // cloudflare already listed under Cloud & Infrastructure

  // Finance
  quickbooks: 'Finance',
  xero: 'Finance',
  freshbooks: 'Finance',
  stripe: 'Finance',
  brex: 'Finance',
  ramp: 'Finance',
  bill: 'Finance',
  expensify: 'Finance',

  // HR & Payroll
  gusto: 'HR & Payroll',
  rippling: 'HR & Payroll',
  deel: 'HR & Payroll',
  remote: 'HR & Payroll',
  bamboohr: 'HR & Payroll',
  workday: 'HR & Payroll',
  adp: 'HR & Payroll',
  paychex: 'HR & Payroll',
  lattice: 'HR & Payroll',
  lever: 'HR & Payroll',
  greenhouse: 'HR & Payroll',
};

/**
 * Suggests a category based on vendor name
 */
export function suggestCategory(vendor: string): string | null {
  const vendorLower = vendor.toLowerCase();

  for (const [keyword, category] of Object.entries(VENDOR_CATEGORY_MAP)) {
    if (vendorLower.includes(keyword)) {
      return category;
    }
  }

  return null;
}

/**
 * Auto-assigns categories to subscriptions that don't have one
 * Returns the number of subscriptions updated
 */
export async function autoAssignCategories(subscriptions: Subscription[]): Promise<number> {
  let updatedCount = 0;

  for (const sub of subscriptions) {
    // Skip if already has a category
    if (sub.category) continue;

    const suggestedCategory = suggestCategory(sub.vendor);

    if (suggestedCategory) {
      try {
        await updateSubscription(sub.id, { category: suggestedCategory });
        updatedCount++;
        console.log(`Auto-assigned category "${suggestedCategory}" to ${sub.vendor}`);
      } catch (err) {
        console.error(`Failed to update category for ${sub.vendor}:`, err);
      }
    }
  }

  return updatedCount;
}
