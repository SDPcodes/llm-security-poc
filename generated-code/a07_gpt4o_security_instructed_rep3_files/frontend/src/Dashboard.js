import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const [profile, setProfile] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('http://localhost:4000/profile', { withCredentials: true });
        setProfile(res.data);
      } catch (err) {
        alert('Error fetching profile');
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
