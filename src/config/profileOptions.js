import * as FiIcons from 'react-icons/fi';

const { FiUser, FiSettings, FiShield } = FiIcons;

export const profileOptions = [
  {
    id: 'jane',
    name: 'Jane',
    type: 'General User',
    icon: FiUser,
    color: 'bg-blue-500',
    description: 'Beer enthusiast and casual drinker'
  },
  {
    id: 'john',
    name: 'John',
    type: 'General User',
    icon: FiUser,
    color: 'bg-green-500',
    description: 'Craft beer lover and reviewer'
  },
  {
    id: 'brewmasters',
    name: 'BrewMasters',
    type: 'Brewery Login',
    icon: FiSettings,
    color: 'bg-amber-500',
    description: 'Brewery management account'
  },
  {
    id: 'admin',
    name: 'Admin',
    type: 'Admin User',
    icon: FiShield,
    color: 'bg-red-500',
    description: 'System administrator'
  }
];
