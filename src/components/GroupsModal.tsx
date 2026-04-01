import React, { useState } from 'react';
import { useCalendar } from '../CalendarContext';
import { Users, Plus, Trash2, Edit2, X } from 'lucide-react';
import { Group } from '../types';

export default function GroupsModal({ onClose }: { onClose: () => void }) {
  const { groups, addGroup, updateGroup, deleteGroup } = useCalendar();
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [membersInput, setMembersInput] = useState('');
  const [shareAllEvents, setShareAllEvents] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingGroup(null);
    setName('');
    setMembersInput('');
    setShareAllEvents(false);
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setIsCreating(false);
    setName(group.name);
    setMembersInput(group.members.join(', '));
    setShareAllEvents(group.shareAllEvents || false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const members = membersInput.split(',').map(s => s.trim()).filter(s => s);
    
    if (isCreating) {
      await addGroup({ name, members, shareAllEvents });
    } else if (editingGroup) {
      await updateGroup(editingGroup.id, { name, members, shareAllEvents });
    }
    
    setIsCreating(false);
    setEditingGroup(null);
  };

  const handleDelete = async (id: string) => {
    setGroupToDelete(id);
  };

  const confirmDelete = async () => {
    if (groupToDelete) {
      await deleteGroup(groupToDelete);
      setGroupToDelete(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-600" />
          Manage Groups
        </h2>

        {isCreating || editingGroup ? (
          <form onSubmit={handleSave} className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              {isCreating ? 'Create New Group' : 'Edit Group'}
            </h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Group Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., Family, Work Team"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Members (emails, comma separated)</label>
              <textarea 
                required
                value={membersInput}
                onChange={e => setMembersInput(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none h-24"
                placeholder="jane@example.com, john@example.com"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareAllEvents}
                  onChange={e => setShareAllEvents(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                Share all my events with this group automatically
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={() => { setIsCreating(false); setEditingGroup(null); }}
                className="flex-1 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Save Group
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <button 
              onClick={handleCreateNew}
              className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-600 rounded-2xl font-medium hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Create New Group
            </button>

            <div className="space-y-3 mt-6">
              {groups.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No groups created yet.</p>
              ) : (
                groups.map(group => (
                  <div key={group.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 transition-colors">
                    <div>
                      <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                        {group.name}
                        {group.shareAllEvents && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                            Auto-share
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-slate-500 truncate max-w-md">
                        {group.members.join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEdit(group)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Group"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(group.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Group"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {groupToDelete && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center rounded-3xl z-10">
            <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-6 max-w-sm w-full mx-4 text-center">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Group?</h3>
              <p className="text-slate-600 mb-6">Are you sure you want to delete this group? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setGroupToDelete(null)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
