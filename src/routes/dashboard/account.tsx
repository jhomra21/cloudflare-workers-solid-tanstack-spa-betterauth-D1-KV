import { createFileRoute } from '@tanstack/solid-router';
import { createSignal, createMemo, Show } from 'solid-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query';
import { toast } from 'solid-sonner';
import { Card, CardContent, CardFooter } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '~/components/ui/avatar';
import { Separator } from '~/components/ui/separator';
import { authClient } from '~/lib/auth-client';
import { sessionQueryOptions } from '~/lib/auth-guard';

function getInitials(name: string) {
	if (!name || name === 'Guest') return name.charAt(0).toUpperCase() || 'G';
	return (
		name
			.split(' ')
			.map((part) => part[0]?.toUpperCase() || '')
			.join('')
			.slice(0, 2) || 'U'
	);
}

function AccountPage() {
	const queryClient = useQueryClient();
	const sessionQuery = useQuery(() => sessionQueryOptions());
	const user = createMemo(() => sessionQuery.data?.user);
	const [name, setName] = createSignal(user()?.name || '');

	type UserUpdateVariables = { name: string; image: string | null | undefined };

	const updateUserMutation = useMutation(() => ({
		mutationFn: (updatedUser: UserUpdateVariables) => authClient.updateUser(updatedUser),
		onMutate: async (updatedUser) => {
			await queryClient.cancelQueries({ queryKey: ['session'] });
			const previousSession = queryClient.getQueryData(['session']);
			queryClient.setQueryData(['session'], (old: any) => ({
				...old,
				user: { ...old.user, name: updatedUser.name }
			}));
			return { previousSession };
		},
		onError: (_err: Error, _updatedUser: UserUpdateVariables, context: any) => {
			if (context?.previousSession) {
				queryClient.setQueryData(['session'], context.previousSession);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ['session'] });
		}
	}));

	const handleSave = (e: Event) => {
		e.preventDefault();
		if (name() === user()?.name) {
			toast.info('No changes made.');
			return;
		}

		const promise = updateUserMutation.mutateAsync({
			name: name(),
			image: user()?.image
		});

		toast.promise(promise, {
			loading: 'Saving changes...',
			success: 'Account updated successfully!',
			error: (err) => `Failed to update: ${err.message}`
		});
	};

	return (
		<div class="container mx-auto max-w-4xl py-8 px-4">
			<div class="mb-8">
				<h1 class="text-3xl font-bold tracking-tight">Account</h1>
				<p class="text-muted-foreground mt-1">Manage your account and profile settings.</p>
			</div>
			<form onSubmit={handleSave} autocomplete="off">
				<Card class="overflow-hidden">
					<CardContent class="p-0">
						<div class="flex items-center justify-between p-6">
							<div>
								<h3 class="text-base font-medium">Your Name</h3>
								<p class="text-sm text-muted-foreground">This will be displayed on your profile.</p>
							</div>
							<Input id="name" name="name" class="max-w-xs" value={name()} onChange={setName} placeholder="Your name" />
						</div>

						<Separator />

						<div class="flex items-center justify-between p-6">
							<div>
								<h3 class="text-base font-medium">Email Address</h3>
								<p class="text-sm text-muted-foreground">Your email address cannot be changed.</p>
							</div>
							<Input
								id="email"
								name="email"
								class="max-w-xs"
								value={user()?.email || ''}
								disabled
								placeholder="Your email"
							/>
						</div>

						<Separator />

						<div class="flex items-center justify-between p-6">
							<div>
								<h3 class="text-base font-medium">Avatar</h3>
								<p class="text-sm text-muted-foreground">This is your profile picture.</p>
							</div>
							<div class="flex items-center gap-4">
								<Avatar class="h-12 w-12">
									<Show
										when={user()?.image}
										fallback={<AvatarFallback class="text-xl">{getInitials(user()?.name || '')}</AvatarFallback>}
									>
										<AvatarImage src={user()?.image!} alt={user()?.name || ''} />
									</Show>
								</Avatar>
								<Button variant="outline" size="sm" disabled class="opacity-60 cursor-not-allowed">
									Change (soon)
								</Button>
							</div>
						</div>
					</CardContent>
					<CardFooter class="flex items-center justify-between bg-muted/50 py-4 px-6">
						<p class="text-sm text-muted-foreground">
							Joined on{' '}
							{user()?.createdAt
								? new Date(user()!.createdAt).toLocaleDateString(undefined, {
										month: 'long',
										day: 'numeric',
										year: 'numeric'
									})
								: '—'}
						</p>
						<Button
							type="submit"
							variant="sf-compute"
							disabled={updateUserMutation.isPending || name() === user()?.name}
						>
							{updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
						</Button>
					</CardFooter>
				</Card>
			</form>
		</div>
	);
}

export const Route = createFileRoute('/dashboard/account')({
	component: AccountPage
}); 