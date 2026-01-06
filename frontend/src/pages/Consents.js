import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { Plus, Search, FileCheck, XCircle, Calendar } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Consents() {
  const { getAuthHeaders } = useAuth();
  const [consents, setConsents] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    persona_id: '',
    act_type: '',
    partner_ids: '',
    distribution_scope: '',
    revocation_rules: '',
    expiry_date: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [consentsRes, personasRes] = await Promise.all([
        axios.get(`${API}/consents`, getAuthHeaders()),
        axios.get(`${API}/personas`, getAuthHeaders())
      ]);
      setConsents(consentsRes.data);
      setPersonas(personasRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        partner_ids: formData.partner_ids.split(',').map(s => s.trim()).filter(Boolean)
      };
      await axios.post(`${API}/consents`, data, getAuthHeaders());
      toast.success('Consent recorded successfully');
      setIsDialogOpen(false);
      setFormData({
        persona_id: '',
        act_type: '',
        partner_ids: '',
        distribution_scope: '',
        revocation_rules: '',
        expiry_date: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create consent');
    }
  };

  const handleRevoke = async (consentId) => {
    if (!window.confirm('Are you sure you want to revoke this consent? Related content will be flagged.')) return;
    
    try {
      await axios.put(`${API}/consents/${consentId}/revoke`, null, getAuthHeaders());
      toast.success('Consent revoked');
      fetchData();
    } catch (error) {
      toast.error('Failed to revoke consent');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'badge-success',
      revoked: 'badge-danger',
      expired: 'badge-warning'
    };
    return <Badge className={styles[status] || styles.active}>{status}</Badge>;
  };

  const getPersonaName = (personaId) => {
    const persona = personas.find(p => p.id === personaId);
    return persona?.persona_name || 'Unknown';
  };

  const filteredConsents = filterStatus === 'all' 
    ? consents 
    : consents.filter(c => c.status === filterStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="consents-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Consent Vault</h1>
          <p className="text-muted-foreground mt-1">Track consent per act, person, and context</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="glow-primary gap-2" data-testid="add-consent-btn">
              <Plus className="h-4 w-4" />
              Record Consent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                New Consent Record
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="persona_id">Persona</Label>
                  <Select 
                    value={formData.persona_id}
                    onValueChange={(value) => setFormData({...formData, persona_id: value})}
                  >
                    <SelectTrigger className="bg-input/50" data-testid="consent-persona-select">
                      <SelectValue placeholder="Select persona" />
                    </SelectTrigger>
                    <SelectContent>
                      {personas.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.persona_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="act_type">Act Type</Label>
                  <Input
                    id="act_type"
                    value={formData.act_type}
                    onChange={(e) => setFormData({...formData, act_type: e.target.value})}
                    placeholder="e.g., Solo content, B/G scene, Custom request"
                    required
                    className="bg-input/50"
                    data-testid="consent-act-type-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="partner_ids">Partner IDs (comma-separated)</Label>
                  <Input
                    id="partner_ids"
                    value={formData.partner_ids}
                    onChange={(e) => setFormData({...formData, partner_ids: e.target.value})}
                    placeholder="Leave empty for solo content"
                    className="bg-input/50"
                    data-testid="consent-partners-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="distribution_scope">Distribution Scope</Label>
                  <Select 
                    value={formData.distribution_scope}
                    onValueChange={(value) => setFormData({...formData, distribution_scope: value})}
                  >
                    <SelectTrigger className="bg-input/50" data-testid="consent-scope-select">
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platform_only">Platform Only</SelectItem>
                      <SelectItem value="multi_platform">Multi-Platform</SelectItem>
                      <SelectItem value="exclusive">Exclusive (Single buyer)</SelectItem>
                      <SelectItem value="unrestricted">Unrestricted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="revocation_rules">Revocation Rules</Label>
                  <Textarea
                    id="revocation_rules"
                    value={formData.revocation_rules}
                    onChange={(e) => setFormData({...formData, revocation_rules: e.target.value})}
                    placeholder="Define conditions under which consent can be revoked"
                    required
                    className="bg-input/50"
                    data-testid="consent-revocation-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiry_date">Expiry Date (Optional)</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                    className="bg-input/50"
                    data-testid="consent-expiry-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="glow-primary" data-testid="consent-submit-btn">
                  Record Consent
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <Card className="border-border bg-card/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {['all', 'active', 'revoked', 'expired'].map(status => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className={filterStatus === status ? 'glow-primary' : ''}
                data-testid={`filter-${status}`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Consents</p>
            <p className="text-2xl font-bold">{consents.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-emerald-400">{consents.filter(c => c.status === 'active').length}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Revoked</p>
            <p className="text-2xl font-bold text-red-400">{consents.filter(c => c.status === 'revoked').length}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Expired</p>
            <p className="text-2xl font-bold text-amber-400">{consents.filter(c => c.status === 'expired').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Consents Table */}
      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>Consent Records ({filteredConsents.length})</CardTitle>
          <CardDescription>Each consent is immutable once created. Revocation creates audit trail.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredConsents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No consent records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Persona</TableHead>
                    <TableHead>Act Type</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConsents.map((consent) => (
                    <TableRow key={consent.id} className="data-row" data-testid={`consent-row-${consent.id}`}>
                      <TableCell className="font-medium">{getPersonaName(consent.persona_id)}</TableCell>
                      <TableCell>{consent.act_type}</TableCell>
                      <TableCell className="capitalize">{consent.distribution_scope?.replace('_', ' ')}</TableCell>
                      <TableCell>{getStatusBadge(consent.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(consent.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {consent.expiry_date ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(consent.expiry_date).toLocaleDateString()}
                          </span>
                        ) : 'No expiry'}
                      </TableCell>
                      <TableCell className="text-right">
                        {consent.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleRevoke(consent.id)}
                            data-testid={`revoke-consent-${consent.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Revoke
                          </Button>
                        )}
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
