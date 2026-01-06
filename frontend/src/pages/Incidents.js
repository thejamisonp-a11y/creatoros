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
import { Plus, AlertTriangle, CheckCircle, Search, Shield } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Incidents() {
  const { getAuthHeaders } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [talents, setTalents] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [resolveDialog, setResolveDialog] = useState({ open: false, id: null });
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [formData, setFormData] = useState({
    persona_id: '',
    talent_id: '',
    incident_type: '',
    severity: 'medium',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [incidentsRes, talentsRes, personasRes] = await Promise.all([
        axios.get(`${API}/incidents`, getAuthHeaders()),
        axios.get(`${API}/talents`, getAuthHeaders()),
        axios.get(`${API}/personas`, getAuthHeaders())
      ]);
      setIncidents(incidentsRes.data);
      setTalents(talentsRes.data);
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
      await axios.post(`${API}/incidents`, formData, getAuthHeaders());
      toast.success('Incident reported successfully');
      setIsDialogOpen(false);
      setFormData({
        persona_id: '',
        talent_id: '',
        incident_type: '',
        severity: 'medium',
        description: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to report incident');
    }
  };

  const handleResolve = async () => {
    if (!resolutionNotes.trim()) {
      toast.error('Resolution notes are required');
      return;
    }
    
    try {
      await axios.put(
        `${API}/incidents/${resolveDialog.id}/resolve?resolution_notes=${encodeURIComponent(resolutionNotes)}`,
        null,
        getAuthHeaders()
      );
      toast.success('Incident resolved');
      setResolveDialog({ open: false, id: null });
      setResolutionNotes('');
      fetchData();
    } catch (error) {
      toast.error('Failed to resolve incident');
    }
  };

  const getSeverityBadge = (severity) => {
    const styles = {
      critical: 'badge-danger animate-pulse',
      high: 'badge-danger',
      medium: 'badge-warning',
      low: 'badge-info'
    };
    return <Badge className={styles[severity] || styles.low}>{severity}</Badge>;
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'badge-danger',
      investigating: 'badge-warning',
      resolved: 'badge-success',
      closed: 'badge-info'
    };
    return <Badge className={styles[status] || styles.open}>{status}</Badge>;
  };

  const filteredIncidents = filterSeverity === 'all'
    ? incidents
    : incidents.filter(i => i.severity === filterSeverity);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="incidents-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Incident Management</h1>
          <p className="text-muted-foreground mt-1">Track and resolve safety incidents</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="glow-primary gap-2" data-testid="report-incident-btn">
              <AlertTriangle className="h-4 w-4" />
              Report Incident
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                Report New Incident
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="incident_type">Incident Type</Label>
                  <Select 
                    value={formData.incident_type}
                    onValueChange={(value) => setFormData({...formData, incident_type: value})}
                  >
                    <SelectTrigger className="bg-input/50" data-testid="incident-type-select">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boundary_violation">Boundary Violation</SelectItem>
                      <SelectItem value="client_misconduct">Client Misconduct</SelectItem>
                      <SelectItem value="platform_dispute">Platform Dispute</SelectItem>
                      <SelectItem value="internal_escalation">Internal Escalation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Select 
                    value={formData.severity}
                    onValueChange={(value) => setFormData({...formData, severity: value})}
                  >
                    <SelectTrigger className="bg-input/50" data-testid="incident-severity-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="talent_id">Related Talent (Optional)</Label>
                  <Select 
                    value={formData.talent_id}
                    onValueChange={(value) => setFormData({...formData, talent_id: value})}
                  >
                    <SelectTrigger className="bg-input/50" data-testid="incident-talent-select">
                      <SelectValue placeholder="Select talent" />
                    </SelectTrigger>
                    <SelectContent>
                      {talents.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.display_id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="persona_id">Related Persona (Optional)</Label>
                  <Select 
                    value={formData.persona_id}
                    onValueChange={(value) => setFormData({...formData, persona_id: value})}
                  >
                    <SelectTrigger className="bg-input/50" data-testid="incident-persona-select">
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Detailed description of the incident"
                    required
                    className="bg-input/50 min-h-[100px]"
                    data-testid="incident-description-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="glow-primary" data-testid="incident-submit-btn">
                  Report Incident
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Severity Filter */}
      <Card className="border-border bg-card/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {['all', 'critical', 'high', 'medium', 'low'].map(severity => (
              <Button
                key={severity}
                variant={filterSeverity === severity ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterSeverity(severity)}
                className={filterSeverity === severity ? 'glow-primary' : ''}
                data-testid={`filter-${severity}`}
              >
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-bold">{incidents.filter(i => i.status === 'open').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-amber-500/20">
                <Search className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Investigating</p>
                <p className="text-2xl font-bold">{incidents.filter(i => i.status === 'investigating').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-emerald-500/20">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold">{incidents.filter(i => i.status === 'resolved').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-red-500/20">
                <Shield className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold">{incidents.filter(i => i.severity === 'critical' && i.status === 'open').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incidents Table */}
      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>Incident Log ({filteredIncidents.length})</CardTitle>
          <CardDescription>Each incident is tracked with full audit trail</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No incidents found. All clear!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncidents.map((incident) => (
                    <TableRow key={incident.id} className="data-row" data-testid={`incident-row-${incident.id}`}>
                      <TableCell className="capitalize font-medium">
                        {incident.incident_type?.replace('_', ' ')}
                      </TableCell>
                      <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {incident.description}
                      </TableCell>
                      <TableCell>{getStatusBadge(incident.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(incident.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {(incident.status === 'open' || incident.status === 'investigating') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-400 hover:text-emerald-300"
                            onClick={() => setResolveDialog({ open: true, id: incident.id })}
                            data-testid={`resolve-incident-${incident.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolve
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

      {/* Resolve Dialog */}
      <Dialog open={resolveDialog.open} onOpenChange={(open) => setResolveDialog({ ...resolveDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Incident</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resolution_notes">Resolution Notes</Label>
              <Textarea
                id="resolution_notes"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe how the incident was resolved"
                className="bg-input/50 min-h-[100px]"
                data-testid="resolution-notes-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResolveDialog({ open: false, id: null })}>
              Cancel
            </Button>
            <Button onClick={handleResolve} className="glow-primary" data-testid="confirm-resolve-btn">
              Confirm Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
