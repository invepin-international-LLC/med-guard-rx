 import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
 import { Button } from '@/components/ui/button';
 import { 
   Home, 
   Pill, 
   Camera, 
   BarChart3, 
   User, 
   Users,
   Phone,
   Shield,
   Settings,
   LogOut,
   Heart
 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 
 interface NavigationDrawerProps {
   open: boolean;
   onClose: () => void;
   onNavigate: (item: 'today' | 'medications' | 'scan' | 'stats' | 'profile') => void;
   activeItem: string;
   isCaregiver?: boolean;
   onCaregiverDashboard?: () => void;
 }
 
 export function NavigationDrawer({ 
   open, 
   onClose, 
   onNavigate, 
   activeItem,
   isCaregiver,
   onCaregiverDashboard 
 }: NavigationDrawerProps) {
   
   const handleNavigation = (item: 'today' | 'medications' | 'scan' | 'stats' | 'profile') => {
     onNavigate(item);
     onClose();
   };
 
   const handleLogout = async () => {
     try {
       await supabase.auth.signOut();
       toast.success('Signed out successfully');
       onClose();
     } catch (error) {
       toast.error('Failed to sign out');
     }
   };
 
   const menuItems = [
     { id: 'today', icon: Home, label: 'Today', description: 'Your daily dashboard' },
     { id: 'medications', icon: Pill, label: 'Medications', description: 'Manage your meds' },
     { id: 'scan', icon: Camera, label: 'Scan', description: 'Add new prescriptions' },
     { id: 'stats', icon: BarChart3, label: 'Statistics', description: 'View your progress' },
     { id: 'profile', icon: User, label: 'Profile', description: 'Settings & preferences' },
   ];
 
   return (
     <Sheet open={open} onOpenChange={onClose}>
       <SheetContent side="left" className="w-80 p-0">
         <SheetHeader className="p-6 pb-4 border-b border-border bg-primary/5">
           <div className="flex items-center gap-3">
             <img 
               src="/favicon.png" 
               alt="Med Guard Rx" 
               className="w-12 h-12 rounded-xl shadow-md"
             />
             <div>
               <SheetTitle className="text-xl">Med Guard Rx</SheetTitle>
               <p className="text-sm text-muted-foreground">Menu</p>
             </div>
           </div>
         </SheetHeader>
 
         <div className="py-4">
           {/* Main Navigation */}
           <div className="px-3 space-y-1">
             {menuItems.map(({ id, icon: Icon, label, description }) => (
               <button
                 key={id}
                 onClick={() => handleNavigation(id as 'today' | 'medications' | 'scan' | 'stats' | 'profile')}
                 className={cn(
                   "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-left",
                   activeItem === id 
                     ? "bg-primary text-primary-foreground" 
                     : "hover:bg-secondary"
                 )}
               >
                 <Icon className="w-6 h-6" />
                 <div>
                   <p className="font-semibold">{label}</p>
                   <p className={cn(
                     "text-sm",
                     activeItem === id ? "text-primary-foreground/80" : "text-muted-foreground"
                   )}>
                     {description}
                   </p>
                 </div>
               </button>
             ))}
           </div>
 
           {/* Divider */}
           <div className="my-4 border-t border-border" />
 
           {/* Additional Actions */}
           <div className="px-3 space-y-1">
             {isCaregiver && (
               <button
                 onClick={() => {
                   onCaregiverDashboard?.();
                   onClose();
                 }}
                 className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-accent/10 text-left"
               >
                 <Users className="w-6 h-6 text-accent" />
                 <div>
                   <p className="font-semibold">Caregiver Dashboard</p>
                   <p className="text-sm text-muted-foreground">View patients you care for</p>
                 </div>
               </button>
             )}
 
             <button
               onClick={() => {
                 handleNavigation('profile');
               }}
               className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-secondary text-left"
             >
               <Phone className="w-6 h-6 text-success" />
               <div>
                 <p className="font-semibold">Emergency Contacts</p>
                 <p className="text-sm text-muted-foreground">Manage caregivers & alerts</p>
               </div>
             </button>
 
             <button
               onClick={() => {
                 handleNavigation('profile');
               }}
               className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-secondary text-left"
             >
               <Shield className="w-6 h-6 text-info" />
               <div>
                 <p className="font-semibold">Health Records</p>
                 <p className="text-sm text-muted-foreground">HIPAA-protected info</p>
               </div>
             </button>
           </div>
 
           {/* Divider */}
           <div className="my-4 border-t border-border" />
 
           {/* Logout */}
           <div className="px-3">
             <button
               onClick={handleLogout}
               className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-destructive/10 text-left text-destructive"
             >
               <LogOut className="w-6 h-6" />
               <div>
                 <p className="font-semibold">Sign Out</p>
                 <p className="text-sm text-destructive/70">Log out of your account</p>
               </div>
             </button>
           </div>
         </div>
 
         {/* Footer */}
         <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-background">
           <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
             <Heart className="w-4 h-4 text-destructive" />
             <span>Made with care for your health</span>
           </div>
         </div>
       </SheetContent>
     </Sheet>
   );
 }