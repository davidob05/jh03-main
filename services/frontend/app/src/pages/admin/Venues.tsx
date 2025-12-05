import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Collapse from '@mui/material/Collapse';
import Paper from '@mui/material/Paper';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InputBase from '@mui/material/InputBase';
import { visuallyHidden } from '@mui/utils';
import { Link as MUILink } from '@mui/material';
import { Link } from 'react-router-dom';
import { LineWeight } from '@mui/icons-material';

import { apiBaseUrl } from '../utils/api';

interface VenueData {
  venue_name: string;
  capacity: number;
  venuetype: string;
  is_accessible: boolean;
  qualifications: string[];
  availability: unknown[];
  provision_capabilities: string[];
  exam_venues: ExamVenueData[];
}

interface RowData {
  id: string;
  name: string;
  capacity: number;
  type: string;
  accessibility: string;
  provisionCapabilities: string;
  examDetails: VenueExamDetail[];
  examSearch: string;
}

interface VenueData {
  venue_name: string;
  capacity: number;
  venuetype: string;
  is_accessible: boolean;
  qualifications: string[];
  availability: unknown[];
  provision_capabilities: string[];
  exam_venues: ExamVenueData[];
}

interface RowData {
  id: string;
  name: string;
  capacity: number;
  type: string;
  accessibility: string;
  provisionCapabilities: string;
  examDetails: VenueExamDetail[];
  examSearch: string;
}

type Order = 'asc' | 'desc';

interface HeadCell {
  disablePadding: boolean;
  id: keyof RowData;
  label: string;
  numeric: boolean;
}

const headCells: readonly HeadCell[] = [
  { id: 'name', numeric: false, disablePadding: true, label: 'Venue' },
  { id: 'capacity', numeric: true, disablePadding: false, label: 'Capacity' },
  { id: 'type', numeric: false, disablePadding: false, label: 'Type' },
  { id: 'accessibility', numeric: false, disablePadding: false, label: 'Accessible' },
  { id: 'provisionCapabilities', numeric: false, disablePadding: false, label: 'Provisions' },
];

const fetchVenues = async (): Promise<VenueData[]> => {
  const response = await fetch(apiBaseUrl + "/venues/");
  if (!response.ok) throw new Error('Unable to load venues');
  return response.json();
};

function formatLabel(text?: string): string {
  if (!text) return 'Unknown';
  const spaced = text.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatDateTime(dateTime?: string): string {
  if (!dateTime) return 'N/A';
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDurationFromLength(length: number | null | undefined): string {
  if (length == null) return 'N/A';
  const hours = Math.floor(length / 60);
  const minutes = Math.round(length % 60);
  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  return parts.length ? parts.join(' ') : '0m';
}

function calculateEndTime(startTime: string | null, examLength: number | null): string {
  if (!startTime || examLength == null) return '';
  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) return '';
  const end = new Date(start.getTime() + examLength * 60000);
  return end.toISOString();
}

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function getComparator<Key extends keyof RowData>(
  order: Order,
  orderBy: Key,
): ((a: RowData, b: RowData) => number) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

interface HeadCell {
  disablePadding: boolean;
  id: keyof VenueData;
  id: keyof VenueData;
  label: string;
  numeric: boolean;
}

const headCells: readonly HeadCell[] = [
  {
    id: 'code',
    numeric: false,
    disablePadding: true,
    label: 'Venue Code',
    label: 'Venue Code',
  },
  {
    id: 'name',
    id: 'name',
    numeric: false,
    disablePadding: false,
    label: 'Name',
    label: 'Name',
  },
  {
    id: 'building',
    id: 'building',
    numeric: false,
    disablePadding: false,
    label: 'Building',
    label: 'Building',
  },
  {
    id: 'capacity',
    numeric: true,
    id: 'capacity',
    numeric: true,
    disablePadding: false,
    label: 'Capacity',
    label: 'Capacity',
  },
  {
    id: 'type',
    id: 'type',
    numeric: false,
    disablePadding: false,
    label: 'Type',
    label: 'Type',
  },
];

interface EnhancedTableProps {
  numSelected: number;
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof RowData) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  order: Order;
  orderBy: keyof RowData;
  rowCount: number;
}

function EnhancedTableHead(props: EnhancedTableProps) {
  const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort } =
    props;
  const createSortHandler =
    (property: keyof RowData) => (event: React.MouseEvent<unknown>) => {
      onRequestSort(event, property);
    };

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
          <Checkbox
            color="primary"
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            inputProps={{
              'aria-label': 'select all venues',
              'aria-label': 'select all venues',
            }}
          />
        </TableCell>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : 'asc'}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <Box component="span" sx={visuallyHidden}>
                  {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                </Box>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
        <TableCell align="center">Details</TableCell>
      </TableRow>
    </TableHead>
  );
}

interface EnhancedTableToolbarProps {
  numSelected: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function EnhancedTableToolbar(props: EnhancedTableToolbarProps) {
  const { numSelected, searchQuery, onSearchChange } = props;
  const { numSelected, searchQuery, onSearchChange } = props;

  return (
    <Toolbar
      sx={[
        {
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
        },
        numSelected > 0 && {
          bgcolor: (theme) =>
            alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
        },
      ]}
    >
      {numSelected > 0 ? (
        <Typography
          sx={{ flex: '1 1 100%' }}
          color="inherit"
          variant="subtitle1"
          component="div"
        >
          {numSelected} selected
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: '1 1 100%' }}>
          <Typography
            variant="h6"
            id="tableTitle"
            component="div"
          >
            Venues
            Venues
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'action.hover',
              borderRadius: 1,
              px: 2,
              py: 0.5,
            }}
          >
            <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
            <InputBase
              placeholder="Search venues..."
              placeholder="Search venues..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              sx={{ width: 250 }}
            />
          </Box>
        </Box>
      )}
      {numSelected > 0 ? (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {numSelected === 1 ? (
            <Tooltip title="Edit">
              <IconButton>
                <EditIcon />
              </IconButton>
            </Tooltip>
          ) : null}
          <Tooltip title="Delete">
            <IconButton>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ) : null}
    </Toolbar>
  );
}

export const AdminVenues: React.FC = () => {
  const [order, setOrder] = React.useState<Order>('asc');
  const [orderBy, setOrderBy] = React.useState<keyof RowData>('name');
  const [selected, setSelected] = React.useState<readonly string[]>([]);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [openRows, setOpenRows] = React.useState<Record<string, boolean>>({});

  const {
    data: venuesData = [],
    isLoading,
    isError,
    error,
  } = useQuery<VenueData[], Error>({
    queryKey: ['venues'],
    queryFn: fetchVenues,
  });

  const rows = React.useMemo<RowData[]>(() => {
    return venuesData.map((venue) => ({
      id: venue.venue_name,
      name: venue.venue_name,
      capacity: venue.capacity,
      type: formatLabel(venue.venuetype),
      accessibility: venue.is_accessible ? 'Yes' : 'No',
      provisionCapabilities: (venue.provision_capabilities || []).join(', '),
      examDetails: (venue.exam_venues || []).map((examVenue) => {
        const endTime = calculateEndTime(examVenue.start_time, examVenue.exam_length);
        return {
          name: examVenue.exam_name,
          start: examVenue.start_time || '',
          end: endTime,
          duration: formatDurationFromLength(examVenue.exam_length),
        };
      }),
      examSearch: (venue.exam_venues || []).map((ev) => ev.exam_name).join(', '),
    }));
  }, [venuesData]);

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = rows.map((n) => n.id);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const handleRequestSort = (
    event: React.MouseEvent<unknown>,
    property: keyof RowData,
  ) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleClick = (event: React.MouseEvent<unknown>, id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: readonly string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),

} from "@mui/material";
import { Container, Table, TableBody, TableCell, TableContainer, TableRow } from "@mui/material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C  selected.slice(selectedIndex + 1),
      );
    }
    setSelected(newSelected);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(0);
  };

  const filteredRows = React.useMemo(() => {
    if (!searchQuery) return rows;

    const lowerQuery = searchQuery.toLowerCase();
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(lowerQuery) ||
        row.type.toLowerCase().includes(lowerQuery) ||
        row.accessibility.toLowerCase().includes(lowerQuery) ||
        row.examSearch.toLowerCase().includes(lowerQuery) ||
        row.provisionCapabilities.toLowerCase().includes(lowerQuery) ||
        row.capacity.toString().includes(lowerQuery)
        row.name.toLowerCase().includes(lowerQuery) ||
        row.type.toLowerCase().includes(lowerQuery) ||
        row.accessibility.toLowerCase().includes(lowerQuery) ||
        row.examSearch.toLowerCase().includes(lowerQuery) ||
        row.provisionCapabilities.toLowerCase().includes(lowerQuery) ||
        row.capacity.toString().includes(lowerQuery)
    );
  }, [rows, searchQuery]);

  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - filteredRows.length) : 0;

  const visibleRows = React.useMemo(
    () =>
      [...filteredRows]
        .sort(getComparator(order, orderBy))
        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [order, orderBy, page, rowsPerPage, filteredRows],
  );

  if (isLoading) {
    return (
      <Box sx={{ width: '100%', maxWidth: 1050, p: 3, mx: 'auto' }}>
        <Paper sx={{ width: '100%', p: 4, textAlign: 'center' }}>
          <Typography variant="h6">Loading venues...</Typography>
        </Paper>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ width: '100%', maxWidth: 1050, p: 3, mx: 'auto' }}>
        <Paper sx={{ width: '100%', p: 4, textAlign: 'center' }}>
          <Typography color="error" variant="h6">
            {error?.message || 'Failed to load venues'}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: 1050, p: 3, mx: "auto" }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <EnhancedTableToolbar
          numSelected={selected.length}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />
        <TableContainer>
          <Table
            sx={{ minWidth: 750 }}
            aria-labelledby="tableTitle"
            size="medium"
          >
            <EnhancedTableHead
              numSelected={selected.length}
              order={order}
              orderBy={orderBy}
              onSelectAllClick={handleSelectAllClick}
              onRequestSort={handleRequestSort}
              rowCount={filteredRows.length}
            />
            <TableBody>
              {visibleRows.map((row, index) => {
                const isItemSelected = selected.includes(row.id);
                const labelId = `enhanced-table-checkbox-${index}`;
                const isOpen = openRows[row.id] || false;

                return (
                  <React.Fragment key={row.id}>
                    <TableRow
                      hover
                      role="checkbox"
                      aria-checked={isItemSelected}
                      tabIndex={-1}
                      selected={isItemSelected}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                          onClick={(event) => handleClick(event, row.id)}
                          inputProps={{
                            'aria-labelledby': labelId,
                          }}
                        />
                      </TableCell>
                      <TableCell
                        component="th"
                        id={labelId}
                        scope="row"
                        padding="none"
                      >
                        <Link to={`/venues/${row.id}`}><MUILink style={{ cursor: 'pointer' }}>{row.name}</MUILink></Link>
                      </TableCell>
                      <TableCell align="right">{row.capacity}</TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell>{row.accessibility}</TableCell>
                      <TableCell>{row.provisionCapabilities || '—'}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          aria-label={isOpen ? 'Collapse venue details' : 'Expand venue details'}
                          onClick={() =>
                            setOpenRows((prev) => ({
                              ...prev,
                              [row.id]: !prev[row.id],
                            }))
                          }
                        >
                          <ExpandMoreIcon
                            sx={{
                              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                            }}
                          />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={headCells.length + 2}>
                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                              Exams in this venue
                            </Typography>
                            {row.examDetails.length ? (
                              <Table size="small" aria-label="exams">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Exam</TableCell>
                                    <TableCell>Start</TableCell>
                                    <TableCell>End</TableCell>
                                    <TableCell>Duration</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {row.examDetails.map((exam) => (
                                    <TableRow key={`${row.id}-${exam.name}-${exam.start}`}>
                                      <TableCell>{exam.name || 'Untitled exam'}</TableCell>
                                      <TableCell>{formatDateTime(exam.start)}</TableCell>
                                      <TableCell>{formatDateTime(exam.end)}</TableCell>
                                      <TableCell>{exam.duration}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No exams scheduled for this venue.
                              </Typography>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
              {emptyRows > 0 && (
                <TableRow
                  style={{
                    height: 53 * emptyRows,
                  }}
                >
                  <TableCell colSpan={7} />
                  <TableCell colSpan={7} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredRows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};
};
