'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Example component showing how to use Firebase
// You can adapt this pattern for your actual dashboard pages

export default function FirebaseExamplePage() {
    const [firestoreUsers, setFirestoreUsers] = useState<any[]>([]);
    const [rtdbUsers, setRtdbUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');

    // Fetch Firestore users
    const fetchFirestoreUsers = async () => {
        setLoading(true);
        try {
            const { getFirestoreUsers } = await import('@/actions/firebase');
            const { users } = await getFirestoreUsers();
            setFirestoreUsers(users);
        } catch (error) {
            console.error('Error fetching Firestore users:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch Realtime Database users
    const fetchRTDBUsers = async () => {
        setLoading(true);
        try {
            const { getRTDBUsers } = await import('@/actions/firebase');
            const { users } = await getRTDBUsers();
            setRtdbUsers(users);
        } catch (error) {
            console.error('Error fetching RTDB users:', error);
        } finally {
            setLoading(false);
        }
    };

    // Create user in Firestore
    const createFirestoreUser = async () => {
        if (!newUserName || !newUserEmail) return;
        
        try {
            const { createFirestoreUser } = await import('@/actions/firebase');
            const result = await createFirestoreUser({
                name: newUserName,
                email: newUserEmail,
            });
            
            if (result.success) {
                alert('User created in Firestore!');
                setNewUserName('');
                setNewUserEmail('');
                fetchFirestoreUsers();
            }
        } catch (error) {
            console.error('Error creating user:', error);
        }
    };

    // Create user in Realtime Database
    const createRTDBUser = async () => {
        if (!newUserName || !newUserEmail) return;
        
        try {
            const { createRTDBUser } = await import('@/actions/firebase');
            const result = await createRTDBUser({
                name: newUserName,
                email: newUserEmail,
            });
            
            if (result.success) {
                alert('User created in Realtime Database!');
                setNewUserName('');
                setNewUserEmail('');
                fetchRTDBUsers();
            }
        } catch (error) {
            console.error('Error creating user:', error);
        }
    };

    useEffect(() => {
        fetchFirestoreUsers();
        fetchRTDBUsers();
    }, []);

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                Firebase Integration Example
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Firestore Section */}
                <Card className="glass-card border-white/10">
                    <CardHeader>
                        <CardTitle className="text-cyan-400">Firestore Database</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-white/80">Users ({firestoreUsers.length})</h3>
                            <div className="max-h-40 overflow-y-auto space-y-2">
                                {firestoreUsers.map((user) => (
                                    <div key={user.id} className="p-2 bg-white/5 rounded text-sm">
                                        <p className="text-white">{user.name}</p>
                                        <p className="text-white/60 text-xs">{user.email}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Input
                                placeholder="Name"
                                value={newUserName}
                                onChange={(e) => setNewUserName(e.target.value)}
                                className="bg-white/5 border-white/10"
                            />
                            <Input
                                placeholder="Email"
                                value={newUserEmail}
                                onChange={(e) => setNewUserEmail(e.target.value)}
                                className="bg-white/5 border-white/10"
                            />
                            <Button
                                onClick={createFirestoreUser}
                                disabled={loading}
                                className="w-full bg-cyan-500 hover:bg-cyan-400"
                            >
                                Add to Firestore
                            </Button>
                            <Button
                                onClick={fetchFirestoreUsers}
                                variant="outline"
                                disabled={loading}
                                className="w-full"
                            >
                                Refresh
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Realtime Database Section */}
                <Card className="glass-card border-white/10">
                    <CardHeader>
                        <CardTitle className="text-purple-400">Realtime Database</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-white/80">Users ({rtdbUsers.length})</h3>
                            <div className="max-h-40 overflow-y-auto space-y-2">
                                {rtdbUsers.map((user) => (
                                    <div key={user.id} className="p-2 bg-white/5 rounded text-sm">
                                        <p className="text-white">{user.name}</p>
                                        <p className="text-white/60 text-xs">{user.email}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Input
                                placeholder="Name"
                                value={newUserName}
                                onChange={(e) => setNewUserName(e.target.value)}
                                className="bg-white/5 border-white/10"
                            />
                            <Input
                                placeholder="Email"
                                value={newUserEmail}
                                onChange={(e) => setNewUserEmail(e.target.value)}
                                className="bg-white/5 border-white/10"
                            />
                            <Button
                                onClick={createRTDBUser}
                                disabled={loading}
                                className="w-full bg-purple-500 hover:bg-purple-400"
                            >
                                Add to RTDB
                            </Button>
                            <Button
                                onClick={fetchRTDBUsers}
                                variant="outline"
                                disabled={loading}
                                className="w-full"
                            >
                                Refresh
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="glass-card border-white/10">
                <CardHeader>
                    <CardTitle className="text-amber-400">Usage Instructions</CardTitle>
                </CardHeader>
                <CardContent className="text-white/70 space-y-2">
                    <p>1. Configure your Firebase project and add credentials to .env.local</p>
                    <p>2. Enable Firestore and Realtime Database in Firebase Console</p>
                    <p>3. Update security rules for your databases</p>
                    <p>4. Use the functions from @/actions/firebase in your components</p>
                    <p className="text-cyan-400 mt-4">
                        See FIREBASE_SETUP.md for detailed setup instructions
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

