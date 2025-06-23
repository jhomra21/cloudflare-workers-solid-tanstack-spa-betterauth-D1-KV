import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Icon } from "~/components/ui/icon";
import { useNoteAnalyticsQuery } from "~/lib/notes-actions";
import { Show } from "solid-js";

export function NotesAnalytics() {
  const analyticsQuery = useNoteAnalyticsQuery();

  return (
    <div class="space-y-4">
      <h2 class="text-xl font-semibold tracking-tight">Analytics Dashboard</h2>
      
      <Show
        when={!analyticsQuery.isLoading && !analyticsQuery.isError}
        fallback={
          <div class="flex justify-center p-8">
            <Show 
              when={!analyticsQuery.isError} 
              fallback={<p>Error loading analytics</p>}
            >
              <p>Loading analytics...</p>
            </Show>
          </div>
        }
      >
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Notes Card */}
          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-medium text-muted-foreground">
                Total Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="flex items-center justify-between">
                <div class="text-2xl font-bold">{analyticsQuery.data?.totalNotes || 0}</div>
                <div class="p-2 bg-primary/10 rounded-full">
                  <Icon name="file" class="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Notes Card */}
          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-medium text-muted-foreground">
                Active Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="flex items-center justify-between">
                <div class="text-2xl font-bold">{analyticsQuery.data?.activeNotes || 0}</div>
                <div class="p-2 bg-green-500/10 rounded-full">
                  <Icon name="sparkles" class="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Archived Notes Card */}
          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-medium text-muted-foreground">
                Archived Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="flex items-center justify-between">
                <div class="text-2xl font-bold">{analyticsQuery.data?.archivedNotes || 0}</div>
                <div class="p-2 bg-blue-500/10 rounded-full">
                  <Icon name="archive" class="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Notes Card */}
          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-medium text-muted-foreground">
                Recent (7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="flex items-center justify-between">
                <div class="text-2xl font-bold">{analyticsQuery.data?.recentNotes || 0}</div>
                <div class="p-2 bg-amber-500/10 rounded-full">
                  <Icon name="history" class="h-4 w-4 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Card */}
        <Card class="mt-4">
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium text-muted-foreground">Content Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <div>Average Content Length</div>
                <div class="font-medium">
                  {analyticsQuery.data?.avgContentLength || 0} characters
                </div>
              </div>
              <div class="flex items-center justify-between">
                <div>Active vs. Archived</div>
                <div class="font-medium">
                  {analyticsQuery.data?.totalNotes ? 
                    `${Math.round((analyticsQuery.data?.activeNotes / analyticsQuery.data?.totalNotes) * 100)}% Active` : 
                    '0% Active'}
                </div>
              </div>
            </div>
            <div class="mt-4 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                class="h-full bg-primary"
                style={{
                  width: analyticsQuery.data?.totalNotes ? 
                    `${Math.round((analyticsQuery.data?.activeNotes / analyticsQuery.data?.totalNotes) * 100)}%` : 
                    '0%'
                }}
              />
            </div>
          </CardContent>
        </Card>
      </Show>
    </div>
  );
} 