import * as React from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Grid,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Avatar,
  ListItemAvatar,
  Stack,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Chip,
  Divider,
  Tooltip,
  InputBase,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ViewList,
  GridView,
  CalendarViewMonth,
  Pending,
  Download,
  Notifications,
  PersonAddAlt1,
  PersonRemove,
  Search,
  ArrowUpward,
  ArrowDownward,
  ArrowBack,
  ArrowForward,
} from '@mui/icons-material';
import {
  StaticDatePicker,
} from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { Dayjs } from 'dayjs';
import { Link as RouterLink } from 'react-router-dom';
import { Link as MUILink } from '@mui/material';
import { InvigilatorAvailabilityModal } from "../../components/admin/InvigilatorAvailabilityModal";

interface Invigilator {
  id: number;
  preferred_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  availableDates?: string[]; // e.g. ['2025-06-15', '2025-06-20']
  availableSlots?: string[]; // e.g. ['2025-06-15T09:00', '2025-06-20T14:00']
}

type ViewMode = 'list' | 'grid' | 'calendar';
type SortField = 'firstName' | 'lastName';
type SortOrder = 'asc' | 'desc';

export const AdminInvigilators: React.FC = () => {
  const [invigilators, setInvigilators] = useState<Invigilator[]>([]);
  const [filtered, setFiltered] = useState<Invigilator[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const initialView = (searchParams.get("view") as ViewMode) || "grid";
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);

  const [firstLetter, setFirstLetter] = useState<string>('All');
  const [lastLetter, setLastLetter] = useState<string>('All');
  const [page, setPage] = useState(1);
  const itemsPerPage = viewMode === 'grid' ? 12 : 10;

  // Calendar state
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);

  // Searching state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('firstName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Month index for calendar view
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);

  // Selection state
  const [selected, setSelected] = useState<number[]>([]);

  // Show all state
  const [showAll, setShowAll] = useState(false);

  // Bulk action state
  const [bulkAction, setBulkAction] = useState("");

  // Handle view mode change
  const handleViewChange = (event: React.MouseEvent<HTMLElement>, value: ViewMode) => {
    if (!value) return;

    setViewMode(value);

    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set("view", value);
      return newParams;
    });
  };

  // Helper to display preferred and full names
  const displayPreferredAndFull = (i: Invigilator) => {
    if (i.preferred_name && i.full_name && i.preferred_name !== i.full_name) {
      return { main: i.preferred_name, sub: i.full_name };
    }
    return { main: i.preferred_name || i.full_name || `Invigilator #${i.id}`, sub: '' };
  };

  // Fake data for demonstration purposes
  useEffect(() => {
    const fake: Invigilator[] = [
      { id: 1, preferred_name: 'Alex', full_name: 'Alexandra Chen', email: 'a.chen@university.edu', availableDates: ['2025-11-15', '2025-11-20'], availableSlots: ['2025-11-15T09:00','2025-11-15T14;00' , '2025-11-20T14:00'] },
      { id: 2, preferred_name: 'Ben', full_name: 'Benjamin Okoro', email: 'b.okoro@university.edu', availableDates: ['2025-11-16'],  availableSlots: ['2025-11-16T10:00'] },
      { id: 3, preferred_name: 'Maria', full_name: 'Maria Garcia', email: 'm.garcia@university.edu', availableDates: ['2025-11-15', '2025-11-18', '2025-11-20'], availableSlots: ['2025-11-15T09:00', '2025-11-18T13:00', '2025-11-20T14:00'] },
      { id: 4, preferred_name: 'Sam', full_name: 'Samantha Patel', email: 's.patel@university.edu',  availableDates: ['2025-11-19'], availableSlots: ['2025-11-19T11:00'] },
      { id: 5, preferred_name: 'Toby', full_name: 'Tobias Müller', email: 't.muller@university.edu', availableDates: ['2025-11-15', '2025-11-17'], availableSlots: ['2025-11-15T09:00', '2025-11-17T12:00'] },
      { id: 6, preferred_name: 'Lily', full_name: 'Lily Thompson', email: 'l.thompson@university.edu', availableDates: ['2025-11-20'], availableSlots: ['2025-11-20T14:00'] },
      { id: 7, preferred_name: 'Raj', full_name: 'Rajesh Kumar', email: 'r.kumar@university.edu', availableDates: ['2025-11-18'], availableSlots: ['2025-11-18T13:00'] },
      { id: 8, preferred_name: 'Emma', full_name: 'Emma Johansson', email: 'e.johansson@university.edu', availableDates: ['2025-11-16', '2025-11-19'], availableSlots: ['2025-11-16T10:00', '2025-11-19T11:00'] },
      { id: 9, preferred_name: 'Omar', full_name: 'Omar Al-Sayed', email: 'o.sayed@university.edu', availableDates: ['2025-11-17'], availableSlots: ['2025-11-17T12:00'] },
      { id: 10, preferred_name: 'Grace', full_name: 'Grace Kim', email: 'g.kim@university.edu', availableDates: ['2025-11-15', '2025-11-20'], availableSlots: ['2025-11-15T09:00', '2025-11-20T14:00'] },
      { id: 11, preferred_name: 'Noah', full_name: 'Noah Williams', email: 'n.williams@university.edu', availableDates: ['2025-11-16'], availableSlots: ['2025-11-16T10:00'] },
      { id: 12, preferred_name: 'Zoe', full_name: 'Zoe Zhang', email: 'z.zhang@university.edu',  availableDates: ['2025-11-18'], availableSlots: ['2025-11-18T13:00'] },
      { id: 13, preferred_name: 'Alex', full_name: 'Alexandra Chen', email: 'a.chen@university.edu', availableDates: ['2025-11-15', '2025-11-20'], availableSlots: ['2025-11-15T09:00', '2025-11-20T16:00'] },
      { id: 14, preferred_name: 'Ben', full_name: 'Benjamin Okoro', email: 'b.okoro@university.edu', availableDates: ['2025-11-16'],  availableSlots: ['2025-11-16T10:00'] },
      { id: 15, preferred_name: 'Maria', full_name: 'Maria Garcia', email: 'm.garcia@university.edu', availableDates: ['2025-11-15', '2025-11-18', '2025-11-20'], availableSlots: ['2025-11-15T09:00', '2025-11-18T16:00', '2025-11-20T14:00'] },
      { id: 16, preferred_name: 'Sam', full_name: 'Samantha Patel', email: 's.patel@university.edu', availableDates: ['2025-11-19'], availableSlots: ['2025-11-19T11:00'] },
      { id: 17, preferred_name: 'Toby', full_name: 'Tobias Müller', email: 't.muller@university.edu', availableDates: ['2025-11-15', '2025-11-17'], availableSlots: ['2025-11-15T09:00', '2025-11-17T16:00'] },
      { id: 18, preferred_name: 'Lily', full_name: 'Lily Thompson', email: 'l.thompson@university.edu', availableDates: ['2025-11-20'], availableSlots: ['2025-11-20T14:00'] },
      { id: 19, preferred_name: 'Raj', full_name: 'Rajesh Kumar', email: 'r.kumar@university.edu', availableDates: ['2025-11-18'], availableSlots: ['2025-11-18T13:00'] },
      { id: 20, preferred_name: 'Emma', full_name: 'Emma Johansson', email: 'e.johansson@university.edu', availableDates: ['2025-11-16', '2025-11-19'], availableSlots: ['2025-11-16T10:00', '2025-11-19T11:00'] },
      { id: 21, preferred_name: 'Omar', full_name: 'Omar Al-Sayed', email: 'o.sayed@university.edu', availableDates: ['2025-11-17'], availableSlots: ['2025-11-17T12:00'] },
      { id: 22, preferred_name: 'Grace', full_name: 'Grace Kim', email: 'g.kim@university.edu', availableDates: ['2025-11-15', '2025-11-20'], availableSlots: ['2025-11-15T09:00', '2025-11-20T14:00'] },
      { id: 23, preferred_name: 'Noah', full_name: 'Noah Williams', email: 'n.williams@university.edu', availableDates: ['2025-11-16'], availableSlots: ['2025-11-16T10:00'] },
      { id: 24, preferred_name: 'Zoe', full_name: 'Zoe Zhang', email: 'z.zhang@university.edu', availableDates: ['2025-11-18'], availableSlots: ['2025-11-18T13:00'] },
    ];

    setTimeout(() => {
      setInvigilators(fake);
      setFiltered(fake);
      setLoading(false);
    }, 500);
  }, []);

  // Filtering logic
  useEffect(() => {
    let result = invigilators;

    if (firstLetter !== 'All') {
      result = result.filter(i => {
        const name = (i.preferred_name || i.full_name || '').trim();
        return name.charAt(0).toUpperCase() === firstLetter;
      });
    }
    if (lastLetter !== 'All') {
      result = result.filter(i => {
        const parts = (i.full_name || '').split(' ');
        const last = parts[parts.length - 1];
        return last.charAt(0).toUpperCase() === lastLetter;
      });
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(i => {
        const preferred = i.preferred_name?.toLowerCase() || '';
        const full = i.full_name?.toLowerCase() || '';
        const first = full.split(' ')[0] || '';
        const last = full.split(' ').slice(-1)[0] || '';
        return preferred.includes(query) || first.includes(query) || last.includes(query);
      });
    }

    // Sort after filtering
    result = sortInvigilators(result);

    setFiltered(result);
    setPage(1);
  }, [firstLetter, lastLetter, invigilators, sortField, sortOrder, searchQuery]);

  // Sorting function
  const sortInvigilators = (data: Invigilator[]) => {
    return [...data].sort((a, b) => {
      const getName = (i: Invigilator) => {
        if (sortField === 'firstName') return (i.preferred_name || i.full_name || '').split(' ')[0].toUpperCase();
        const parts = (i.full_name || '').split(' ');
        return parts[parts.length - 1].toUpperCase();
      };

      const nameA = getName(a);
      const nameB = getName(b);

      if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
      if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Find invigilators available on a specific date
  const getAvailableOnDate = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    return filtered.filter(i => 
      i.availableDates?.includes(dateStr)
    );
  };

  // Toggle selection of an invigilator
  const toggleSelect = (id: number) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === filtered.length) {
      setSelected([]);
    } else {
      setSelected(filtered.map(i => i.id));
    }
  };

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = showAll
    ? filtered
    : filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const displayName = (i: Invigilator) =>
    i.preferred_name || i.full_name || `Invigilator #${i.id}`;

  const getInitials = (i: Invigilator) =>
    displayName(i)
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  if (loading) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography sx={{ mt: 2 }}>Loading invigilators…</Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Invigilators</Typography>
          <ToggleButtonGroup value={viewMode} exclusive onChange={handleViewChange} color="primary">
            <ToggleButton value="grid"><GridView /></ToggleButton>
            <ToggleButton value="list"><ViewList /></ToggleButton>
            <ToggleButton value="calendar"><CalendarViewMonth /></ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" mb={2} flexWrap="wrap">
          {/* Search input */}
          <Box
              sx={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "action.hover",
                borderRadius: 1,
                px: 2,
                py: 0.5,
              }}
            >
            <Search sx={{ color: "action.active", mr: 1 }} />
            <InputBase
              placeholder="Search invigilators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: 250 }}
            />
          </Box>

          {/* Sort by First Name */}
          <Button
            variant="outlined"
            size="medium"
            endIcon={
              sortField === 'firstName' ? (
                sortOrder === 'asc' ? <ArrowUpward /> : <ArrowDownward />
              ) : null
            }
            onClick={() => {
              if (sortField === 'firstName') {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              } else {
                setSortField('firstName');
                setSortOrder('asc');
              }
            }}
            sx={{
              minWidth: 160,
              justifyContent: 'space-between',
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            FIRST NAME
          </Button>

          {/* Sort by Last Name */}
          <Button
            variant="outlined"
            size="medium"
            endIcon={
              sortField === 'lastName' ? (
                sortOrder === 'asc' ? <ArrowUpward /> : <ArrowDownward />
              ) : null
            }
            onClick={() => {
              if (sortField === 'lastName') {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              } else {
                setSortField('lastName');
                setSortOrder('asc');
              }
            }}
            sx={{
              minWidth: 160,
              justifyContent: 'space-between',
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            LAST NAME
          </Button>
        </Stack>

        {/* A-Z Filters */}
        <Stack spacing={2} mb={3}>
          <Typography variant="subtitle2">First name</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label="All" color={firstLetter === 'All' ? 'primary' : 'default'} onClick={() => setFirstLetter('All')} />
            {alphabet.map(l => (
              <Chip key={l} label={l} color={firstLetter === l ? 'primary' : 'default'} onClick={() => setFirstLetter(l)} />
            ))}
          </Stack>

          <Typography variant="subtitle2" sx={{ mt: 2 }}>Last name</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label="All" color={lastLetter === 'All' ? 'primary' : 'default'} onClick={() => setLastLetter('All')} />
            {alphabet.map(l => (
              <Chip key={l} label={l} color={lastLetter === l ? 'primary' : 'default'} onClick={() => setLastLetter(l)} />
            ))}
          </Stack>
        </Stack>

        {/* Counter */}
        <Typography variant="h6" gutterBottom color="primary">
          {filtered.length} invigilators found
        </Typography>

        <Divider sx={{ mb: 3 }} />

        {/* Content */}
        {viewMode === 'calendar' ? (
          <Paper
            elevation={4}
            sx={{
              m: 3,
              borderRadius: 3,
              overflow: 'hidden',
              display: 'flex018',
              flexDirection: 'column',
              height: 'calc(100vh - 165px)',
            }}
          >
            {/* Header */}
            <Box sx={{ p: 3, backgroundColor: 'primary.main', color: 'white', textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={600}>
                Invigilator Availability
              </Typography>
            </Box>

            {/* Three Independent Calendars */}
            <Box sx={{ display: 'flex', p: 3, gap: 3, flex: 1, overflow: 'hidden' }}>
              {[-1, 0, 1].map((offset) => {
                const monthDate = dayjs('2025-12-01').add(currentMonthIndex + offset, 'month');
                const isCurrentMonth = offset === 0;

                return (
                  <Box
                    key={monthDate.format('YYYY-MM')}
                    sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      bgcolor: isCurrentMonth ? 'action.selected' : 'background.paper',
                      borderRadius: 2,
                      p: 2,
                      boxShadow: isCurrentMonth ? 3 : 1,
                    }}
                  >
                    <Typography variant="h6" align="center" gutterBottom sx={{ fontWeight: 600 }}>
                      {monthDate.format('MMMM YYYY')}
                    </Typography>

                    <StaticDatePicker
                      displayStaticWrapperAs="desktop"
                      value={monthDate}
                      onChange={(newValue) => {
                        setSelectedDate(newValue);
                        setCalendarModalOpen(true);
                      }}
                      slots={{
                        toolbar: () => null,
                        calendarHeader: () => null,
                        layout: (props) => <>{props.children}</>,
                      }}
                      slotProps={{
                        day: (ownerState) => ({
                          sx: invigilators.some((i) =>
                            i.availableDates?.includes((ownerState.day as Dayjs).format('YYYY-MM-DD'))
                          )
                            ? {
                                '&::after': {
                                  content: '""',
                                  position: 'absolute',
                                  bottom: 6,
                                  right: 6,
                                  width: 10,
                                  height: 10,
                                  bgcolor: 'success.main',
                                  borderRadius: '50%',
                                  border: '2px solid white',
                                },
                              }
                            : {},
                        }),
                      }}
                      views={['day']}
                      showDaysOutsideCurrentMonth
                      sx={{
                        '& .MuiPickersDay-root': {
                          width: 42,
                          height: 42,
                          fontSize: '0.9rem',
                        },
                      }}
                    />
                  </Box>
                );
              })}
            </Box>

            {/* Navigation */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button
                variant="contained"
                startIcon={<ArrowBack />}
                onClick={() => setCurrentMonthIndex(prev => prev - 1)}
                size="large"
              >
                Previous
              </Button>
              <Button
                variant="contained"
                endIcon={<ArrowForward />}
                onClick={() => setCurrentMonthIndex(prev => prev + 1)}
                size="large"
              >
                Next
              </Button>
            </Box>
          </Paper>
        ) : viewMode === 'list' ? (
          <Paper>
            <List>
              {paginated.map(i => (
                <ListItem key={i.id} divider sx={{ pl: 1 }}>
                  <Checkbox
                    checked={selected.includes(i.id)}
                    onChange={() => toggleSelect(i.id)}
                    sx={{ mr: 2 }}
                  />

                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main', fontSize: '1rem' }}>
                      {getInitials(i)}
                    </Avatar>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Box>
                        <MUILink
                          component={RouterLink}
                          to={`/admin/invigilators/${i.id}`}
                          color="primary"
                          underline="none"
                          sx={{ fontWeight: 600, mr: 1 }}
                        >
                          {displayPreferredAndFull(i).main}
                        </MUILink>
                        {displayPreferredAndFull(i).sub && (
                          <Typography component="span" variant="body2" color="text.secondary">
                            ({displayPreferredAndFull(i).sub})
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={i.email}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {paginated.map(i => (
              // @ts-ignore
              <Grid component="div" item xs={12} sm={6} md={4} lg={3} key={i.id}>
                <Card
                  sx={{
                    width: 200,
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': { boxShadow: 8 },
                    transition: '0.2s',
                  }}
                >
                  {/* Checkbox in top-right */}
                  <Checkbox
                    checked={selected.includes(i.id)}
                    onChange={() => toggleSelect(i.id)}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      p: 0.5
                    }}
                  />
                  <CardContent sx={{ textAlign: 'center', pt: 4 }}>
                    <Avatar sx={{ width: 80, height: 80, mx: 'auto', bgcolor: 'primary.main', fontSize: '2rem' }}>
                      {getInitials(i)}
                    </Avatar>

                    {(() => {
                      const names = displayPreferredAndFull(i);
                      return (
                        <>
                          <MUILink
                            component={RouterLink}
                            to={`/admin/invigilators/${i.id}`}
                            color="primary"
                            underline="none"
                            sx={{
                              display: 'block',
                              mt: 2,
                              fontWeight: 600,
                              fontSize: '1.15rem',
                              lineHeight: 1.3,
                              fontFamily: theme => theme.typography.fontFamily,
                            }}
                          >
                            {names.main}
                          </MUILink>

                          {names.sub && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.5, display: 'block', fontFamily: theme => theme.typography.fontFamily}}
                            >
                              ({names.sub})
                            </Typography>
                          )}
                        </>
                      );
                    })()}

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontFamily: theme => theme.typography.fontFamily}}>
                      {i.email || 'No email'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Calendar Modal */}
        <InvigilatorAvailabilityModal
          open={calendarModalOpen}
          onClose={() => setCalendarModalOpen(false)}
          date={selectedDate}
          invigilators={invigilators}
        />

        {/* Pagination & Bulk Actions */}
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={3} mt={4}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button variant="outlined" startIcon={selected.length === filtered.length ? (<PersonRemove />) : (<PersonAddAlt1 />)} onClick={toggleSelectAll}>
              {selected.length === filtered.length
                ? "Deselect all invigilators"
                : `Select all ${filtered.length} invigilators`}
            </Button>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>With all selected users...</InputLabel>
              <Select
                label="With all selected users..."
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
              >
                <MenuItem value="">
                  <em>Choose...</em>
                </MenuItem>
                <MenuItem value="export">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Download fontSize="small" /> Export timetable
                  </Stack>
                </MenuItem>
                <MenuItem value="notify">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Notifications fontSize="small" /> Send notification
                  </Stack>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Dynamic Icon */}
            <Tooltip
              title={
                bulkAction === "export"
                  ? "This downloads the selected invigilator's timetable(s)"
                  : bulkAction === "notify"
                  ? "Send a notification to the selected invigilator(s)"
                  : "Choose an action"
              }
            >
              {bulkAction === "export" ? (
                <Download color="action" />
              ) : bulkAction === "notify" ? (
                <Notifications color="action" />
              ) : (
                <PendingIcon color="disabled" /> // neutral icon before selection
              )}
            </Tooltip>
          </Stack>

          <Pagination count={totalPages} page={page} onChange={(e, v) => setPage(v)} color="primary" />
        </Stack>

        {/* Show All Button */}
        {filtered.length > itemsPerPage && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button
              variant="text"
              onClick={() => setShowAll(prev => !prev)}
            >
              {showAll ? `Show less` : `Show all ${filtered.length} invigilators`}
            </Button>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};