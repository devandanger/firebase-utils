import { Timestamp, GeoPoint } from '@google-cloud/firestore';

export const sampleDocuments = {
  user1: {
    id: 'user-001',
    data: {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      active: true,
      role: 'user',
      tags: ['premium', 'verified'],
      createdAt: Timestamp.fromDate(new Date('2024-01-01T00:00:00Z')),
      location: new GeoPoint(37.7749, -122.4194),
      profile: {
        bio: 'Software developer',
        preferences: {
          theme: 'dark',
          notifications: true
        }
      }
    },
    metadata: {
      createTime: Timestamp.fromDate(new Date('2024-01-01T00:00:00Z')),
      updateTime: Timestamp.fromDate(new Date('2024-01-15T10:30:00Z'))
    }
  },

  user1Modified: {
    id: 'user-001',
    data: {
      name: 'John Doe',
      email: 'john.doe@example.com', // Changed email
      age: 31, // Changed age
      active: true,
      role: 'admin', // Changed role
      tags: ['premium', 'verified', 'staff'], // Added tag
      createdAt: Timestamp.fromDate(new Date('2024-01-01T00:00:00Z')),
      location: new GeoPoint(37.7749, -122.4194),
      profile: {
        bio: 'Senior Software developer', // Changed bio
        preferences: {
          theme: 'dark',
          notifications: false // Changed preference
        }
      }
    },
    metadata: {
      createTime: Timestamp.fromDate(new Date('2024-01-01T00:00:00Z')),
      updateTime: Timestamp.fromDate(new Date('2024-01-16T14:20:00Z')) // Updated timestamp
    }
  },

  user2: {
    id: 'user-002',
    data: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      age: 28,
      active: false,
      role: 'moderator',
      tags: ['verified'],
      createdAt: Timestamp.fromDate(new Date('2024-01-02T12:00:00Z')),
      location: new GeoPoint(40.7128, -74.0060),
      profile: {
        bio: 'Community manager',
        preferences: {
          theme: 'light',
          notifications: true
        }
      }
    }
  },

  product1: {
    id: 'prod-001',
    data: {
      name: 'Wireless Headphones',
      category: 'electronics',
      price: 99.99,
      inStock: true,
      quantity: 50,
      tags: ['audio', 'wireless', 'premium'],
      specifications: {
        color: 'black',
        batteryLife: '30 hours',
        features: ['noise-cancelling', 'bluetooth-5.0']
      }
    }
  }
};

export const sampleCollections = {
  users: [sampleDocuments.user1, sampleDocuments.user2],
  usersModified: [sampleDocuments.user1Modified, sampleDocuments.user2],
  products: [sampleDocuments.product1],
  emptyCollection: []
};

export const normalizedSampleData = {
  user1: {
    _id: 'user-001',
    _metadata: {
      createTime: {
        _type: 'Timestamp',
        seconds: 1704067200,
        nanoseconds: 0,
        iso: '2024-01-01T00:00:00.000Z'
      },
      updateTime: {
        _type: 'Timestamp',
        seconds: 1705314600,
        nanoseconds: 0,
        iso: '2024-01-15T10:30:00.000Z'
      }
    },
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    active: true,
    role: 'user',
    tags: ['premium', 'verified'],
    createdAt: {
      _type: 'Timestamp',
      seconds: 1704067200,
      nanoseconds: 0,
      iso: '2024-01-01T00:00:00.000Z'
    },
    location: {
      _type: 'GeoPoint',
      latitude: 37.7749,
      longitude: -122.4194
    },
    profile: {
      bio: 'Software developer',
      preferences: {
        theme: 'dark',
        notifications: true
      }
    }
  }
};

export const filterTestData = {
  activeUsers: [
    { id: 'user-1', data: { name: 'Active User 1', active: true, role: 'user' } },
    { id: 'user-2', data: { name: 'Active User 2', active: true, role: 'admin' } }
  ],
  inactiveUsers: [
    { id: 'user-3', data: { name: 'Inactive User 1', active: false, role: 'user' } }
  ],
  adminUsers: [
    { id: 'admin-1', data: { name: 'Admin 1', active: true, role: 'admin' } }
  ]
};

export const errorTestCases = {
  invalidProjectId: 'invalid-project-123',
  invalidDocumentPath: 'invalid/path/structure',
  invalidCollectionPath: '',
  invalidServiceAccountPath: '/path/to/nonexistent/sa.json',
  malformedFilter: 'invalid-filter-syntax'
};