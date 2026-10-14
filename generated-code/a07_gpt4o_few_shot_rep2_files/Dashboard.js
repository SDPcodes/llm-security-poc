import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Dashboard() {
  const [profile, setProfile] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('/api/profile');
        setProfile(response.data);
      } catch (error) {
        alert('Failed to fetch profile: ' + error.response.data.error);
      }
    };
    fetchProfile();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Username: {profile.username}</p>
      <p>Email: {profile.email}</p>
    </div>
  );
}

export default Dashboard;
