import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { useAsync } from '../../hooks/useAsync';
import { fetchCollegeDashboard } from './api';
import { StatCard, Card, CardHeader, CardBody } from '../../components/ui/Card';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Icon } from '../../components/ui/Icon';

const GROUP_COLORS = { trust: '#16a34a', concern: '#ca8a04', close: '#dc2626' };

export default function StaffDashboard() {
  const { data, loading, error, refetch } = useAsync(() => fetchCollegeDashboard(), []);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  const { summary, byClass, byDepartment } = data;

  const pieData = [
    { name: 'กลุ่มไว้ใจ', value: summary.trustCount, key: 'trust' },
    { name: 'กลุ่มห่วงใย', value: summary.concernCount, key: 'concern' },
    { name: 'กลุ่มใกล้ชิด', value: summary.closeCount, key: 'close' },
  ];

  const classData = Object.entries(byClass).map(([className, s]) => ({
    name: className,
    ไว้ใจ: s.trustCount,
    ห่วงใย: s.concernCount,
    ใกล้ชิด: s.closeCount,
  }));

  const deptData = Object.entries(byDepartment).map(([dept, s]) => ({
    name: dept,
    เยี่ยมแล้ว: s.visitedCount,
    ยังไม่เยี่ยม: s.unvisitedCount,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">ภาพรวมทั้งวิทยาลัย</h1>
        <p className="text-sm text-gray-500">งานครูที่ปรึกษา · วิทยาลัยเทคนิคระยอง</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard label="นักเรียนทั้งหมด" value={summary.totalStudents} icon={<Icon name="users" />} />
        <StatCard label="คัดกรองแล้ว" value={summary.screenedCount} tone="trust" icon={<Icon name="clipboard" />} />
        <StatCard label="เยี่ยมบ้านแล้ว" value={summary.visitedCount} icon={<Icon name="map" />} />
        <StatCard label="ส่งต่อแล้ว" value={summary.referredCount} icon={<Icon name="send" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="สัดส่วนกลุ่มไว้ใจ / ห่วงใย / ใกล้ชิด" />
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={GROUP_COLORS[entry.key as keyof typeof GROUP_COLORS]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="สถานะการเยี่ยมบ้านตามสาขาวิชา" />
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="เยี่ยมแล้ว" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ยังไม่เยี่ยม" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="ผลการคัดกรองแยกตามกลุ่มเรียน" />
        <CardBody>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={classData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="ไว้ใจ" stackId="a" fill={GROUP_COLORS.trust} radius={[0, 0, 0, 0]} />
              <Bar dataKey="ห่วงใย" stackId="a" fill={GROUP_COLORS.concern} />
              <Bar dataKey="ใกล้ชิด" stackId="a" fill={GROUP_COLORS.close} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>
    </div>
  );
}
