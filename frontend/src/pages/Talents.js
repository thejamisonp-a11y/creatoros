import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { Plus, Search, Eye, Shield, Lock, UserPlus } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Talents() {
  const { getAuthHeaders } = useAuth();
  const [talents, setTalents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    legal_name: '',
    dob: '',
    emergency_contact: '',
    verification_status: 'pending',
    notes: ''
  });

  useEffect(() => {
    fetchTalents();
  }, []);

  const fetchTalents = async () => {
    try {
      const response = await axios.get(`${API}/talents`, getAuthHeaders());
      setTalents(response.data);
    } catch (error) {
      toast.error('Failed to load talents');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/talents`, formData, getAuthHeaders());
      toast.success('Talent created successfully');
      setIsDialogOpen(false);
      setFormData({
        legal_name: '',
        dob: '',
        emergency_contact: '',
        verification_status: 'pending',
        notes: ''
      });
      fetchTalents();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create talent');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      verified: 'badge-success',
      pending: 'badge-warning',
      rejected: 'badge-danger'
    };
    return <Badge className={styles[status] || styles.pending}>{status}</Badge>;
  };

  const getReadinessColor = (score) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const filteredTalents = talents.filter(t => 
    t.display_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="talents-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Talent Registry</h1>
          <p className="text-muted-foreground mt-1">Manage talent profiles and encrypted records</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="glow-primary gap-2" data-testid="add-talent-btn">
              <UserPlus className="h-4 w-4" />
              Add Talent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                New Talent Record
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <Shield className="h-4 w-4" />
                    Field-Level Encryption Active
                  </div>
                  <p className="text-muted-foreground mt-1">
                    Legal name, DOB, and emergency contact will be encrypted at rest.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legal_name">Legal Name (Encrypted)</Label>
                  <Input
                    id="legal_name"
                    value={formData.legal_name}
                    onChange={(e) => setFormData({...formData, legal_name: e.target.value})}
                    required
                    className="bg-input/50"
                    data-testid="talent-legal-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth (Encrypted)</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({...formData, dob: e.target.value})}
                    required
                    className="bg-input/50"
                    data-testid="talent-dob-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_contact">Emergency Contact (Encrypted)</Label>
                  <Input
                    id="emergency_contact"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
                    placeholder="Name: Phone"
                    className="bg-input/50"
                    data-testid="talent-emergency-contact-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verification_status">Verification Status</Label>
                  <Select 
                    value={formData.verification_status} 
                    onValueChange={(value) => setFormData({...formData, verification_status: value})}
                  >
                    <SelectTrigger className="bg-input/50" data-testid="talent-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Private notes (non-exportable)"
                    className="bg-input/50"
                    data-testid="talent-notes-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="glow-primary" data-testid="talent-submit-btn">
                  Create Talent
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="border-border bg-card/50">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-input/50"
              data-testid="talent-search-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Talents Table */}
      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>All Talents ({filteredTalents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTalents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No talents found. Add your first talent to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Personas</TableHead>
                    <TableHead>Readiness</TableHead>
                    <TableHead>Onboarding</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTalents.map((talent) => (
                    <TableRow key={talent.id} className="data-row" data-testid={`talent-row-${talent.id}`}>
                      <TableCell className="font-mono text-sm">{talent.display_id}</TableCell>
                      <TableCell>{getStatusBadge(talent.verification_status)}</TableCell>
                      <TableCell>{talent.persona_count}</TableCell>
                      <TableCell>
                        <span className={`font-mono ${getReadinessColor(talent.readiness_score)}`}>
                          {talent.readiness_score}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {talent.onboarding_complete ? (
                          <Badge className="badge-success">Complete</Badge>
                        ) : (
                          <Badge className="badge-warning">In Progress</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(talent.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/talents/${talent.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1" data-testid={`view-talent-${talent.id}`}>
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
