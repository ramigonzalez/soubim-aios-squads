/** Notificações on phones (README §7: reached from Mais): the same list as the desktop popover. */
import { NotificationList } from '../components/organisms/Notifications'
import { PageContainer } from '../components/templates/PageContainer'

export default function NotificationsPage() {
  return (
    <PageContainer>
      <NotificationList className="overflow-hidden rounded-lg border border-line bg-surface" />
    </PageContainer>
  )
}
