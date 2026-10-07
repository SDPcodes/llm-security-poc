import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('/api/profile', { withCredentials: true });
        setProfile(response.data);
      } catch (error) {
        alert('Failed to fetch profile');
      }
    };

    fetchProfile();
  }, []);

  if (!profile) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome, {profile.username}</h1>
      <p>Email: {profile.email}</p>
    </div>
  );
}

export default Dashboard;
