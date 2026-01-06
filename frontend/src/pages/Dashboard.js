import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCircle,
  AlertTriangle,
  ListTodo,
  DollarSign,
  Activity,
  TrendingUp,
  ChevronRight,
  Shield,
  Clock
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
  const { getAuthHeaders } = useAuth();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, alertsRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`, getAuthHeaders()),
        axios.get(`${API}/dashboard/alerts`, getAuthHeaders())
      ]);
      setStats(statsRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, link }) => (
    <Card className="card-hover border-border bg-card/50" data-testid={`stat-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {link && (
          <Link to={link} className="flex items-center gap-1 text-sm text-primary mt-4 hover:underline">
            View details <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </CardContent>
    </Card>
  );

  const getSeverityBadge = (severity) => {
    const styles = {
      critical: 'badge-danger',
      high: 'badge-danger',
      medium: 'badge-warning',
      low: 'badge-info'
    };
    return <Badge className={styles[severity] || styles.low}>{severity}</Badge>;
  };

  const getAlertIcon = (type) => {
    const icons = {
      incident: AlertTriangle,
      risk: Shield,
      task: Clock
    };
    const Icon = icons[type] || AlertTriangle;
    return <Icon className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Control Room</h1>
        <p className="text-muted-foreground mt-1">Overview of operations and risk status</p>
      </div>

      {/* Stats Grid - Bento Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Talents"
          value={stats?.total_talents || 0}
          icon={Users}
          color="bg-primary/20 text-primary"
          link="/talents"
        />
        <StatCard
          title="Active Personas"
          value={stats?.total_personas || 0}
          icon={UserCircle}
          color="bg-blue-500/20 text-blue-400"
          link="/personas"
        />
        <StatCard
          title="Active Incidents"
          value={stats?.active_incidents || 0}
          icon={AlertTriangle}
          color={stats?.active_incidents > 0 ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}
          link="/incidents"
        />
        <StatCard
          title="Pending Tasks"
          value={stats?.pending_tasks || 0}
          icon={ListTodo}
          color="bg-amber-500/20 text-amber-400"
          link="/tasks"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border bg-card/50" data-testid="revenue-mtd-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/20">
                <DollarSign className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue MTD</p>
                <p className="text-2xl font-bold">${stats?.total_revenue_mtd?.toLocaleString() || 0}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-emerald-400 ml-auto" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50" data-testid="onboarding-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/20">
                <Activity className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Onboarding In Progress</p>
                <p className="text-2xl font-bold">{stats?.onboarding_in_progress || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50" data-testid="high-risk-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stats?.high_risk_personas > 0 ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                <Shield className={`h-6 w-6 ${stats?.high_risk_personas > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">High Risk Personas</p>
                <p className="text-2xl font-bold">{stats?.high_risk_personas || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <Card className="border-border bg-card/50" data-testid="alerts-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Active Alerts
          </CardTitle>
          <CardDescription>Issues requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No active alerts. All systems operational.</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {alerts.map((alert, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    data-testid={`alert-${index}`}
                  >
                    <div className={`p-2 rounded ${
                      alert.severity === 'critical' || alert.severity === 'high' 
                        ? 'bg-red-500/20 text-red-400' 
                        : alert.severity === 'medium'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getSeverityBadge(alert.severity)}
                        <span className="text-xs text-muted-foreground capitalize">{alert.type}</span>
                      </div>
                    </div>
                    <Link to={alert.link}>
                      <Button variant="ghost" size="sm" data-testid={`view-alert-${index}`}>
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-border bg-card/50" data-testid="quick-actions-card">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/talents">
              <Button variant="secondary" className="w-full justify-start gap-2" data-testid="quick-add-talent">
                <Users className="h-4 w-4" />
                Add Talent
              </Button>
            </Link>
            <Link to="/personas">
              <Button variant="secondary" className="w-full justify-start gap-2" data-testid="quick-add-persona">
                <UserCircle className="h-4 w-4" />
                New Persona
              </Button>
            </Link>
            <Link to="/incidents">
              <Button variant="secondary" className="w-full justify-start gap-2" data-testid="quick-report-incident">
                <AlertTriangle className="h-4 w-4" />
                Report Incident
              </Button>
            </Link>
            <Link to="/tasks">
              <Button variant="secondary" className="w-full justify-start gap-2" data-testid="quick-create-task">
                <ListTodo className="h-4 w-4" />
                Create Task
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
