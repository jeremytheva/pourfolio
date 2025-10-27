export const buildUserProfile = (user) => {
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata || {};

  return {
    id: user.id,
    email: user.email,
    name: metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Pourfolio Member',
    type: metadata.role || metadata.accountType || 'General User',
    description: metadata.bio || 'Pourfolio community member',
    defaultBeverageCategory: metadata.defaultBeverageCategory || 'beer',
    avatar: metadata.avatar_url || metadata.avatar || null
  };
};

export const buildDemoUser = () => ({
  id: 'demo-user',
  email: 'demo@pourfolio.app',
  name: 'Demo User',
  type: 'General User',
  description: 'Using offline demo credentials',
  defaultBeverageCategory: 'beer'
});
